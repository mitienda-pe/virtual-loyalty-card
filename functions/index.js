// functions/index.js
import { onRequest } from "firebase-functions/v2/https";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import twilio from "twilio";
import express from "express";
import cors from "cors";
import { app as firebaseApp, db } from "./src/config.js";
import { createPref } from "./src/mercadopago.js";
import axios from "axios";
import crypto from "crypto";

// Inicializar Vision API client
const visionClient = new ImageAnnotatorClient();

// Crear app Express para WhatsApp (Twilio)
const expressApp = express();

// Crear app Express para WhatsApp API (Facebook)
const whatsappApiApp = express();

// Middleware para WhatsApp (Twilio)
expressApp.use(cors({ origin: true }));
expressApp.use(express.urlencoded({ extended: true }));
expressApp.use(express.json());

// Middleware para WhatsApp API (Facebook)
whatsappApiApp.use(cors({ origin: true }));
whatsappApiApp.use(express.json());

// Configuración de WhatsApp API (Facebook)
const WHATSAPP_API_VERSION = "v18.0";
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "tu_token_de_verificacion";

// Función auxiliar para extraer RUC e importe del texto
const extractRUCAndAmount = (text) => {
  // Patrones comunes para RUC en facturas peruanas
  const rucPatterns = [/R\.U\.C\.[\s:]*([0-9]{11})/i, /RUC[\s:]*([0-9]{11})/i];

  // Patrones para montos
  const amountPatterns = [
    /Total a Pagar S\/[\s]*:[\s]*([0-9]+\.[0-9]{2})/i,
    /Importe Total S\/[\s]*:[\s]*([0-9]+\.[0-9]{2})/i,
    /Total[\s:]*S\/[\s]*([0-9]+\.[0-9]{2})/i,
    /S\/[\s]*([0-9]+\.[0-9]{2})/,
  ];

  let ruc = null;
  let amount = null;

  // Buscar RUC
  for (const pattern of rucPatterns) {
    const match = text.match(pattern);
    if (match) {
      ruc = match[1];
      break;
    }
  }

  // Buscar monto
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(",", "."));
      break;
    }
  }

  return { ruc, amount };
};

// Función para verificar si un ticket es duplicado
const isDuplicateReceipt = async (
  businessSlug,
  phoneNumber,
  amount,
  imageUrl
) => {
  const customerRef = db.collection("customers").doc(phoneNumber);
  const customerDoc = await customerRef.get();

  if (!customerDoc.exists) {
    return false;
  }

  const customerData = customerDoc.data();
  const businessPurchases =
    customerData.businesses?.[businessSlug]?.purchases || [];

  return businessPurchases.some(
    (purchase) =>
      Math.abs(purchase.amount - amount) < 0.01 ||
      purchase.receiptUrl === imageUrl
  );
};

// Función para validar tiempo entre compras
const validateTimeBetweenPurchases = async (
  businessSlug,
  phoneNumber,
  timeLimit
) => {
  const customerRef = db.collection("customers").doc(phoneNumber);
  const customerDoc = await customerRef.get();

  if (!customerDoc.exists) {
    return { valid: true };
  }

  const customerData = customerDoc.data();
  const businessData = customerData.businesses?.[businessSlug];

  if (!businessData?.lastVisit) {
    return { valid: true };
  }

  const lastVisitTime = businessData.lastVisit.toDate();
  const timeElapsed = Date.now() - lastVisitTime.getTime();

  if (timeElapsed < timeLimit) {
    const minutesRemaining = Math.ceil((timeLimit - timeElapsed) / 60000);
    return {
      valid: false,
      message: `Por favor espera ${minutesRemaining} minutos antes de registrar otra compra.`,
    };
  }

  return { valid: true };
};

// Función para procesar imágenes con Vision API
const processReceiptImage = async (imageUrl) => {
  try {
    // Descargar la imagen o usar la URL directamente si es compatible con Vision API
    const [result] = await visionClient.textDetection(imageUrl);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return { success: false, message: "No se pudo detectar texto en la imagen." };
    }
    
    const text = detections[0].description;
    const { ruc, amount } = extractRUCAndAmount(text);
    
    return {
      success: true,
      text,
      ruc,
      amount,
    };
  } catch (error) {
    console.error("Error procesando imagen:", error);
    return { success: false, message: "Error al procesar la imagen." };
  }
};

// Función para registrar la compra en la base de datos
const registerPurchase = async (businessSlug, phoneNumber, amount, imageUrl) => {
  try {
    const customerRef = db.collection("customers").doc(phoneNumber);
    const customerDoc = await customerRef.get();
    
    let customerData = {};
    if (customerDoc.exists) {
      customerData = customerDoc.data();
    }
    
    if (!customerData.businesses) {
      customerData.businesses = {};
    }
    
    if (!customerData.businesses[businessSlug]) {
      customerData.businesses[businessSlug] = {
        visits: 0,
        purchases: [],
        lastVisit: new Date()
      };
    }
    
    // Incrementar visitas
    customerData.businesses[businessSlug].visits += 1;
    customerData.businesses[businessSlug].lastVisit = new Date();
    
    // Agregar compra
    const purchase = {
      amount,
      timestamp: new Date(),
      receiptUrl: imageUrl
    };
    
    customerData.businesses[businessSlug].purchases.push(purchase);
    
    // Actualizar o crear documento del cliente
    await customerRef.set(customerData, { merge: true });
    
    return {
      success: true,
      visits: customerData.businesses[businessSlug].visits
    };
  } catch (error) {
    console.error("Error registrando compra:", error);
    return { success: false, message: "Error al registrar la compra." };
  }
};

// Función para enviar mensaje a través de WhatsApp API
const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    const data = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "text",
      text: {
        body: message
      }
    };
    
    const response = await axios.post(url, data, {
      headers: {
        "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error enviando mensaje WhatsApp:", error);
    return { success: false, error };
  }
};

// Función para descargar media de WhatsApp API
const downloadWhatsAppMedia = async (mediaId) => {
  try {
    // Obtener URL de la media
    const mediaUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`;
    const mediaResponse = await axios.get(mediaUrl, {
      headers: {
        "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`
      }
    });
    
    // Descargar el contenido de la media
    const mediaContentResponse = await axios.get(mediaResponse.data.url, {
      headers: {
        "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`
      },
      responseType: 'arraybuffer'
    });
    
    // Aquí podrías subir el contenido a Firebase Storage o procesarlo directamente
    // Por ahora, devolvemos la URL para procesamiento directo con Vision API
    return {
      success: true,
      mediaUrl: mediaResponse.data.url,
      mediaData: mediaContentResponse.data
    };
  } catch (error) {
    console.error("Error descargando media:", error);
    return { success: false, error };
  }
};

// Verificar firma de las solicitudes de WhatsApp API
const verifyWhatsAppSignature = (req, res, next) => {
  if (!WHATSAPP_APP_SECRET) {
    // Si no hay app secret configurado, saltamos la verificación
    return next();
  }
  
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    console.error("Falta la firma de verificación");
    return res.sendStatus(401);
  }
  
  const elements = signature.split('=');
  const signatureHash = elements[1];
  
  const expectedHash = crypto
    .createHmac('sha256', WHATSAPP_APP_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signatureHash !== expectedHash) {
    console.error("Firma inválida");
    return res.sendStatus(401);
  }
  
  next();
};

// Manejar mensajes de WhatsApp (Twilio)
expressApp.post("/", async (req, res) => {
  try {
    const { From, NumMedia } = req.body;
    const phoneNumber = From.replace("whatsapp:", "");
    const messagingResponse = new twilio.twiml.MessagingResponse();

    // Si no hay imágenes adjuntas
    if (NumMedia === "0") {
      messagingResponse.message(
        "Por favor, envía una foto de tu comprobante de pago para registrar tu visita."
      );
      res.set("Content-Type", "text/xml");
      return res.send(messagingResponse.toString());
    }

    // Obtener URL de la primera imagen
    const mediaUrl = req.body[`MediaUrl0`];
    
    // Procesar la imagen
    const processResult = await processReceiptImage(mediaUrl);
    
    if (!processResult.success) {
      messagingResponse.message(processResult.message || "No pudimos procesar tu comprobante. Por favor, intenta con otra imagen.");
      res.set("Content-Type", "text/xml");
      return res.send(messagingResponse.toString());
    }
    
    // Verificar si pertenece a un negocio (usando RUC)
    const businessRef = db.collection("businesses").where("ruc", "==", processResult.ruc);
    const businessSnapshot = await businessRef.get();
    
    if (businessSnapshot.empty) {
      messagingResponse.message("No encontramos un negocio asociado a este comprobante. Asegúrate de que el RUC sea visible en la imagen.");
      res.set("Content-Type", "text/xml");
      return res.send(messagingResponse.toString());
    }
    
    const businessDoc = businessSnapshot.docs[0];
    const businessData = businessDoc.data();
    const businessSlug = businessDoc.id;
    
    // Verificar si es un ticket duplicado
    const isDuplicate = await isDuplicateReceipt(
      businessSlug,
      phoneNumber,
      processResult.amount,
      mediaUrl
    );
    
    if (isDuplicate) {
      messagingResponse.message("Ya has registrado este comprobante anteriormente.");
      res.set("Content-Type", "text/xml");
      return res.send(messagingResponse.toString());
    }
    
    // Verificar tiempo entre compras
    const timeLimit = businessData.timeBetweenPurchases || 60000; // 1 minuto por defecto
    const timeValidation = await validateTimeBetweenPurchases(
      businessSlug,
      phoneNumber,
      timeLimit
    );
    
    if (!timeValidation.valid) {
      messagingResponse.message(timeValidation.message);
      res.set("Content-Type", "text/xml");
      return res.send(messagingResponse.toString());
    }
    
    // Registrar la compra
    const registerResult = await registerPurchase(
      businessSlug,
      phoneNumber,
      processResult.amount,
      mediaUrl
    );
    
    if (!registerResult.success) {
      messagingResponse.message(registerResult.message || "Hubo un problema al registrar tu compra. Por favor, intenta de nuevo.");
      res.set("Content-Type", "text/xml");
      return res.send(messagingResponse.toString());
    }
    
    // Obtener información de recompensas
    const visitsRequired = businessData.visitsForReward || 10;
    const currentVisits = registerResult.visits;
    const remainingVisits = visitsRequired - (currentVisits % visitsRequired);
    
    if (remainingVisits === 0) {
      messagingResponse.message(`¡Felicidades! Has completado ${visitsRequired} visitas en ${businessData.name}. ¡Has ganado una recompensa! Muestra este mensaje en el establecimiento para reclamarla.`);
    } else {
      messagingResponse.message(`¡Gracias por tu compra en ${businessData.name}! Has acumulado ${currentVisits} visitas. Te faltan ${remainingVisits} visitas más para obtener tu recompensa.`);
    }
    
    res.set("Content-Type", "text/xml");
    res.send(messagingResponse.toString());
  } catch (error) {
    console.error("Error:", error);
    const messagingResponse = new twilio.twiml.MessagingResponse();
    messagingResponse.message(
      "Lo siento, ha ocurrido un error al procesar tu ticket. Por favor, intenta de nuevo."
    );
    res.set("Content-Type", "text/xml");
    res.send(messagingResponse.toString());
  }
});

// Verificación del webhook para WhatsApp API
whatsappApiApp.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  
  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verificado");
    return res.status(200).send(challenge);
  }
  
  console.error("Verificación fallida");
  return res.sendStatus(403);
});

// Manejar mensajes de WhatsApp API (Facebook)
whatsappApiApp.post("/", verifyWhatsAppSignature, async (req, res) => {
  try {
    // Responder rápidamente para evitar timeouts
    res.status(200).send("EVENT_RECEIVED");
    
    const body = req.body;
    
    // Verificar si es un mensaje de WhatsApp
    if (body.object !== "whatsapp_business_account") {
      return;
    }
    
    // Procesar cada entrada
    for (const entry of body.entry) {
      // Procesar cada cambio en los mensajes
      for (const change of entry.changes) {
        if (change.field !== "messages") {
          continue;
        }
        
        const value = change.value;
        
        // Procesar cada mensaje
        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            const phoneNumber = message.from;
            
            // Verificar si es un mensaje con imagen
            if (message.type === "image") {
              const mediaId = message.image.id;
              
              // Descargar la imagen
              const mediaResult = await downloadWhatsAppMedia(mediaId);
              
              if (!mediaResult.success) {
                await sendWhatsAppMessage(phoneNumber, "No pudimos descargar la imagen. Por favor, intenta de nuevo.");
                continue;
              }
              
              // Procesar la imagen
              const processResult = await processReceiptImage(mediaResult.mediaUrl);
              
              if (!processResult.success) {
                await sendWhatsAppMessage(phoneNumber, processResult.message || "No pudimos procesar tu comprobante. Por favor, intenta con otra imagen.");
                continue;
              }
              
              // Verificar si pertenece a un negocio (usando RUC)
              const businessRef = db.collection("businesses").where("ruc", "==", processResult.ruc);
              const businessSnapshot = await businessRef.get();
              
              if (businessSnapshot.empty) {
                await sendWhatsAppMessage(phoneNumber, "No encontramos un negocio asociado a este comprobante. Asegúrate de que el RUC sea visible en la imagen.");
                continue;
              }
              
              const businessDoc = businessSnapshot.docs[0];
              const businessData = businessDoc.data();
              const businessSlug = businessDoc.id;
              
              // Verificar si es un ticket duplicado
              const isDuplicate = await isDuplicateReceipt(
                businessSlug,
                phoneNumber,
                processResult.amount,
                mediaResult.mediaUrl
              );
              
              if (isDuplicate) {
                await sendWhatsAppMessage(phoneNumber, "Ya has registrado este comprobante anteriormente.");
                continue;
              }
              
              // Verificar tiempo entre compras
              const timeLimit = businessData.timeBetweenPurchases || 60000; // 1 minuto por defecto
              const timeValidation = await validateTimeBetweenPurchases(
                businessSlug,
                phoneNumber,
                timeLimit
              );
              
              if (!timeValidation.valid) {
                await sendWhatsAppMessage(phoneNumber, timeValidation.message);
                continue;
              }
              
              // Registrar la compra
              const registerResult = await registerPurchase(
                businessSlug,
                phoneNumber,
                processResult.amount,
                mediaResult.mediaUrl
              );
              
              if (!registerResult.success) {
                await sendWhatsAppMessage(phoneNumber, registerResult.message || "Hubo un problema al registrar tu compra. Por favor, intenta de nuevo.");
                continue;
              }
              
              // Obtener información de recompensas
              const visitsRequired = businessData.visitsForReward || 10;
              const currentVisits = registerResult.visits;
              const remainingVisits = visitsRequired - (currentVisits % visitsRequired);
              
              if (remainingVisits === 0) {
                await sendWhatsAppMessage(phoneNumber, `¡Felicidades! Has completado ${visitsRequired} visitas en ${businessData.name}. ¡Has ganado una recompensa! Muestra este mensaje en el establecimiento para reclamarla.`);
              } else {
                await sendWhatsAppMessage(phoneNumber, `¡Gracias por tu compra en ${businessData.name}! Has acumulado ${currentVisits} visitas. Te faltan ${remainingVisits} visitas más para obtener tu recompensa.`);
              }
            } else if (message.type === "text") {
              // Responder a mensajes de texto
              await sendWhatsAppMessage(phoneNumber, "Por favor, envía una foto de tu comprobante de pago para registrar tu visita.");
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error procesando webhook:", error);
  }
});

export const createPreference = createPref;
export const processWhatsAppMessage = onRequest(expressApp);
export const processWhatsAppAPI = onRequest(whatsappApiApp);
