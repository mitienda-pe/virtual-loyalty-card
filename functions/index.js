// functions/index.js
import { onRequest } from "firebase-functions/v2/https";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import express from "express";
import cors from "cors";
import { app as firebaseApp, db } from "./src/config.js";
import { createPref } from "./src/mercadopago.js";
import axios from "axios";
import crypto from "crypto";
import * as functions from "firebase-functions";

// Definir parámetros de entorno
const whatsappApiToken = process.env.WHATSAPP_API_TOKEN || "";
const whatsappAppSecret = process.env.WHATSAPP_APP_SECRET || "";
const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "108512615643697";
const whatsappVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "38f7d5a1-b65c-4e9d-9f2d-ea9c21b7ca56";

// Inicializar Vision API client
const visionClient = new ImageAnnotatorClient();

// Crear app Express para WhatsApp API (Facebook)
const whatsappApiApp = express();

// Middleware para WhatsApp API (Facebook)
whatsappApiApp.use(cors({ origin: true }));
whatsappApiApp.use(express.json());

// Configuración de WhatsApp API (Facebook)
const WHATSAPP_API_VERSION = "v18.0";
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

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
async function isDuplicateReceipt(businessSlug, phoneNumber, amount, imageUrl) {
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
async function validateTimeBetweenPurchases(
  businessSlug,
  phoneNumber,
  timeLimit
) {
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
async function processReceiptImage(imageUrl) {
  try {
    // Realizar análisis de la imagen con Vision API
    const [result] = await visionClient.textDetection(imageUrl);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      console.log("No se detectó texto en la imagen");
      return { success: false, error: "No se detectó texto en la imagen" };
    }

    // El primer elemento contiene todo el texto detectado
    const text = detections[0].description;
    console.log("Texto detectado:", text);

    // Extraer información relevante (RUC, monto, etc.)
    const { ruc, amount } = extractRUCAndAmount(text);

    return {
      success: true,
      text,
      ruc,
      amount,
    };
  } catch (error) {
    console.error("Error procesando imagen:", error);
    return { success: false, error: error.message };
  }
};

// Función para registrar la compra en la base de datos
async function registerPurchase(businessSlug, phoneNumber, amount, imageUrl) {
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
        lastVisit: new Date(),
      };
    }

    // Incrementar visitas
    customerData.businesses[businessSlug].visits += 1;
    customerData.businesses[businessSlug].lastVisit = new Date();

    // Agregar compra
    const purchase = {
      amount,
      timestamp: new Date(),
      receiptUrl: imageUrl,
    };

    customerData.businesses[businessSlug].purchases.push(purchase);

    // Actualizar o crear documento del cliente
    await customerRef.set(customerData, { merge: true });

    return {
      success: true,
      visits: customerData.businesses[businessSlug].visits,
    };
  } catch (error) {
    console.error("Error registrando compra:", error);
    return { success: false, message: "Error al registrar la compra." };
  }
};

// Función para enviar mensaje a través de WhatsApp API
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    // Obtener la configuración de WhatsApp desde Firestore
    const configSnapshot = await db.collection("system").doc("whatsapp_config").get();
    let apiToken = whatsappApiToken;

    if (configSnapshot.exists) {
      const config = configSnapshot.data();
      apiToken = config.apiToken || apiToken;
    }

    if (!apiToken) {
      throw new Error("Token de API de WhatsApp no configurado");
    }

    // Formatear el número de teléfono si es necesario
    if (phoneNumber.startsWith("+")) {
      phoneNumber = phoneNumber.substring(1);
    }

    // Enviar mensaje a través de la API de WhatsApp
    const response = await axios({
      method: "POST",
      url: `${WHATSAPP_API_URL}/${whatsappPhoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      },
    });

    console.log("Mensaje enviado correctamente:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error enviando mensaje de WhatsApp:", error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

// Función para descargar media de WhatsApp API
async function downloadWhatsAppMedia(mediaId) {
  try {
    // Obtener la configuración de WhatsApp desde Firestore
    const configSnapshot = await db.collection("system").doc("whatsapp_config").get();
    let apiToken = whatsappApiToken;

    if (configSnapshot.exists) {
      const config = configSnapshot.data();
      apiToken = config.apiToken || apiToken;
    }

    if (!apiToken) {
      throw new Error("Token de API de WhatsApp no configurado");
    }

    // Primero obtenemos la URL del media
    const mediaResponse = await axios({
      method: "GET",
      url: `${WHATSAPP_API_URL}/${mediaId}`,
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    const mediaUrl = mediaResponse.data.url;

    // Luego descargamos el contenido del media
    const mediaContent = await axios({
      method: "GET",
      url: mediaUrl,
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      responseType: "arraybuffer",
    });

    return {
      success: true,
      data: mediaContent.data,
      mimeType: mediaContent.headers["content-type"],
    };
  } catch (error) {
    console.error("Error descargando media:", error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

// Middleware para verificar firma de las solicitudes de WhatsApp API
async function verifyWhatsAppSignature(req, res, next) {
  try {
    // Obtener la configuración de WhatsApp desde Firestore
    const configSnapshot = await db.collection("system").doc("whatsapp_config").get();
    let appSecret = whatsappAppSecret;

    if (configSnapshot.exists) {
      const config = configSnapshot.data();
      appSecret = config.appSecret || appSecret;
    }

    if (!appSecret) {
      console.warn("Secreto de la aplicación de WhatsApp no configurado, omitiendo verificación de firma");
      return next();
    }

    const signature = req.headers["x-hub-signature-256"];
    if (!signature) {
      console.error("No se encontró la firma en los headers");
      return res.status(401).send("No signature found");
    }

    const [algorithm, expectedHash] = signature.split("=");
    if (algorithm !== "sha256") {
      console.error("Algoritmo de firma no soportado");
      return res.status(401).send("Unsupported signature algorithm");
    }

    const body = JSON.stringify(req.body);
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(body);
    const calculatedHash = hmac.digest("hex");

    if (calculatedHash !== expectedHash) {
      console.error("Firma inválida");
      return res.status(401).send("Invalid signature");
    }

    next();
  } catch (error) {
    console.error("Error verificando firma:", error);
    res.status(500).send("Error verifying signature");
  }
};

// Ruta para verificación del webhook de WhatsApp
whatsappApiApp.get("/", (req, res) => {
  // Verificar el token de verificación
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === whatsappVerifyToken) {
    console.log("Webhook verificado correctamente");
    res.status(200).send(challenge);
  } else {
    console.error("Verificación fallida. Token incorrecto.");
    res.status(403).send("Verificación fallida");
  }
});

// Ruta para procesar mensajes entrantes de WhatsApp
whatsappApiApp.post("/", verifyWhatsAppSignature, async (req, res) => {
  try {
    // Responder rápidamente para evitar timeouts
    res.status(200).send("EVENT_RECEIVED");

    const body = req.body;

    // Verificar que sea un mensaje de WhatsApp
    if (!body.object || body.object !== "whatsapp_business_account") {
      console.log("Evento no soportado:", body.object);
      return;
    }

    // Obtener la configuración de WhatsApp desde Firestore
    const configSnapshot = await db.collection("system").doc("whatsapp_config").get();
    const whatsappConfig = configSnapshot.exists ? configSnapshot.data() : {};

    // Procesar cada entrada (puede haber múltiples en un solo webhook)
    for (const entry of body.entry) {
      // Procesar cada cambio en los mensajes
      for (const change of entry.changes) {
        if (change.field !== "messages") {
          continue;
        }

        const value = change.value;

        // Verificar si hay mensajes
        if (!value.messages || value.messages.length === 0) {
          continue;
        }

        // Obtener información del contacto
        const contacts = value.contacts || [];
        if (contacts.length === 0) {
          console.log("No se encontró información del contacto");
          continue;
        }

        const contact = contacts[0];
        const phone = contact.wa_id;
        const name = contact.profile?.name || "Cliente";

        console.log(`Mensaje recibido de ${name} (${phone})`);

        // Buscar o crear usuario
        let user = await findOrCreateUser(phone, name);

        // Procesar cada mensaje
        for (const message of value.messages) {
          const messageId = message.id;
          const timestamp = message.timestamp;

          console.log(`Procesando mensaje ${messageId} del tipo ${message.type}`);

          // Procesar según el tipo de mensaje
          switch (message.type) {
            case "image":
              // Procesar imagen (comprobante de pago)
              await processImageMessage(message, user, whatsappConfig);
              break;

            case "text":
              // Procesar texto (comandos o consultas)
              await processTextMessage(message, user, whatsappConfig);
              break;

            default:
              // Mensaje no soportado
              await sendWhatsAppMessage(
                phone,
                "Para registrar un consumo, envía una foto del comprobante de pago. Para consultar tus puntos, envía la palabra 'puntos'."
              );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error procesando webhook:", error);
  }
});

// Función para buscar o crear un usuario
async function findOrCreateUser(phone, name) {
  try {
    // Buscar usuario por teléfono
    const usersSnapshot = await db
      .collection("users")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    // Si el usuario existe, retornarlo
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0].data();
      return {
        id: usersSnapshot.docs[0].id,
        ...userData,
      };
    }

    // Si no existe, crear un nuevo usuario
    const newUser = {
      displayName: name,
      phone: phone,
      role: "business-client",
      registeredVia: "whatsapp",
      disabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userRef = await db.collection("users").add(newUser);

    console.log(`Nuevo usuario creado: ${userRef.id}`);

    return {
      id: userRef.id,
      ...newUser,
    };
  } catch (error) {
    console.error("Error buscando/creando usuario:", error);
    throw error;
  }
};

// Función para procesar mensajes de imagen
async function processImageMessage(message, user, whatsappConfig) {
  try {
    const imageId = message.image.id;

    // Descargar la imagen
    const mediaResult = await downloadWhatsAppMedia(imageId);
    if (!mediaResult.success) {
      await sendWhatsAppMessage(
        user.phone,
        "Lo sentimos, no pudimos procesar tu imagen. Por favor, intenta nuevamente."
      );
      return;
    }

    // Procesar la imagen con Vision API
    // Aquí implementaríamos la lógica para extraer información del comprobante
    // Por ahora, simularemos este proceso

    // Obtener un negocio aleatorio para la demostración
    const businessesSnapshot = await db.collection("businesses").limit(10).get();
    if (businessesSnapshot.empty) {
      await sendWhatsAppMessage(
        user.phone,
        "Lo sentimos, no hay negocios disponibles en este momento."
      );
      return;
    }

    const businesses = businessesSnapshot.docs;
    const randomIndex = Math.floor(Math.random() * businesses.length);
    const business = businesses[randomIndex];
    const businessData = business.data();

    // Simular monto y puntos
    const amount = Math.floor(Math.random() * 100) + 20; // Entre 20 y 120
    const points = Math.floor(amount / 10); // 1 punto por cada 10 unidades

    // Registrar la transacción
    const transaction = {
      userId: user.id,
      businessId: business.id,
      amount: amount,
      points: points,
      status: "completed",
      type: "purchase",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("transactions").add(transaction);

    // Actualizar puntos del cliente
    const clientPointsSnapshot = await db
      .collection("client_points")
      .where("userId", "==", user.id)
      .where("businessId", "==", business.id)
      .limit(1)
      .get();

    if (clientPointsSnapshot.empty) {
      // Crear nuevo registro de puntos
      await db.collection("client_points").add({
        userId: user.id,
        businessId: business.id,
        points: points,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      // Actualizar puntos existentes
      const pointsDoc = clientPointsSnapshot.docs[0];
      const currentPoints = pointsDoc.data().points || 0;

      await pointsDoc.ref.update({
        points: currentPoints + points,
        updatedAt: new Date(),
      });
    }

    // Enviar confirmación al cliente
    let responseMessage = `¡Gracias por tu compra en ${businessData.name}!\n\n`;
    responseMessage += `📝 Detalles:\n`;
    responseMessage += `- Monto: $${amount}\n`;
    responseMessage += `- Puntos ganados: ${points}\n`;

    // Obtener total de puntos
    const updatedPointsSnapshot = await db
      .collection("client_points")
      .where("userId", "==", user.id)
      .where("businessId", "==", business.id)
      .limit(1)
      .get();

    if (!updatedPointsSnapshot.empty) {
      const totalPoints = updatedPointsSnapshot.docs[0].data().points || 0;
      responseMessage += `- Total de puntos: ${totalPoints}\n\n`;
    }

    responseMessage += `Puedes consultar tus puntos enviando la palabra "puntos".`;

    await sendWhatsAppMessage(user.phone, responseMessage);
  } catch (error) {
    console.error("Error procesando mensaje de imagen:", error);

    await sendWhatsAppMessage(
      user.phone,
      "Lo sentimos, hubo un problema procesando tu comprobante. Por favor, intenta nuevamente o contacta al negocio directamente."
    );
  }
};

// Función para procesar mensajes de texto
async function processTextMessage(message, user, whatsappConfig) {
  try {
    const text = message.text.body.toLowerCase().trim();

    // Comando para consultar puntos
    if (text === "puntos") {
      await sendPointsInfo(user);
      return;
    }

    // Comando para ayuda
    if (text === "ayuda" || text === "help") {
      await sendHelpInfo(user);
      return;
    }

    // Respuesta genérica para otros mensajes
    await sendWhatsAppMessage(
      user.phone,
      "Para registrar un consumo, envía una foto del comprobante de pago. Para consultar tus puntos, envía la palabra 'puntos'."
    );
  } catch (error) {
    console.error("Error procesando mensaje de texto:", error);
  }
};

// Función para enviar información de puntos al usuario
async function sendPointsInfo(user) {
  try {
    // Obtener los puntos del cliente en todos los negocios
    const pointsSnapshot = await db
      .collection("client_points")
      .where("userId", "==", user.id)
      .get();

    if (pointsSnapshot.empty) {
      await sendWhatsAppMessage(
        user.phone,
        "Aún no tienes puntos acumulados en ningún negocio. Envía fotos de tus comprobantes de pago para comenzar a acumular puntos."
      );
      return;
    }

    // Construir mensaje con los puntos en cada negocio
    let message = "🏆 *Tus puntos acumulados:*\n\n";

    for (const doc of pointsSnapshot.docs) {
      const pointsData = doc.data();
      const businessDoc = await db
        .collection("businesses")
        .doc(pointsData.businessId)
        .get();

      if (businessDoc.exists) {
        const businessData = businessDoc.data();
        message += `*${businessData.name}*: ${pointsData.points} puntos\n`;
      }
    }

    message += "\nPara canjear tus puntos, visita el negocio y muestra este mensaje.";

    await sendWhatsAppMessage(user.phone, message);
  } catch (error) {
    console.error("Error enviando información de puntos:", error);
  }
};

// Función para enviar información de ayuda al usuario
async function sendHelpInfo(user) {
  const helpMessage = `*¡Bienvenido a nuestra Tarjeta de Fidelidad Virtual!*

Aquí tienes algunas instrucciones:

📸 *Envía una foto* del comprobante de pago para registrar tu consumo y acumular puntos.

✍️ Envía estos comandos para:
- *puntos*: Consultar tus puntos acumulados
- *ayuda*: Ver este mensaje de ayuda

¿Tienes dudas? Contacta directamente al negocio para más información.`;

  await sendWhatsAppMessage(user.phone, helpMessage);
};

export const createPreference = createPref;
export const processWhatsAppAPI = onRequest(whatsappApiApp);
