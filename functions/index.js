// process.env.NODE_ENV = "development";
// console.log("¡IMPORTANTE! Entorno forzado a:", process.env.NODE_ENV);

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

// Configurar entorno de desarrollo para pruebas
process.env.NODE_ENV = process.env.NODE_ENV || "development";
console.log("Modo de entorno:", process.env.NODE_ENV);

const config = functions.config();

// Definir parámetros de entorno para WhatsApp con valores predeterminados
const whatsappPhoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID;
const whatsappVerifyToken = config.WHATSAPP_VERIFY_TOKEN;
const whatsappApiToken = config.WHATSAPP_API_TOKEN;
const whatsappAppSecret = config.WHATSAPP_APP_SECRET;

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
}

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
}

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
}

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
}

// Configuración de WhatsApp API (Facebook)

// Función para enviar mensaje a través de WhatsApp API
async function sendWhatsAppMessage(phoneNumber, message, phoneNumberId) {
  try {
    // Usar el ID proporcionado o caer en el valor por defecto
    const apiToken = process.env.WHATSAPP_API_TOKEN || whatsappApiToken;
    const phoneId =
      phoneNumberId ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      whatsappPhoneNumberId;

    console.log("📲 Enviando mensaje a:", phoneNumber);
    console.log("💬 Contenido del mensaje:", message);
    console.log(
      "🔑 Usando token de API de WhatsApp:",
      apiToken ? apiToken.substring(0, 10) + "..." : "No disponible"
    );
    console.log("📱 Usando ID de número de teléfono:", phoneId);

    if (!apiToken) {
      console.error("❌ Token de API de WhatsApp no configurado");
      throw new Error("Token de API de WhatsApp no configurado");
    }

    // Formatear el número de teléfono si es necesario
    if (phoneNumber.startsWith("+")) {
      phoneNumber = phoneNumber.substring(1);
    }

    // Enviar mensaje a través de la API de WhatsApp
    console.log("🔄 Realizando solicitud a la API de WhatsApp...");
    const response = await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${phoneId}/messages`,
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

    console.log(
      "✅ Mensaje enviado correctamente:",
      JSON.stringify(response.data, null, 2)
    );
    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ Error enviando mensaje de WhatsApp:", error.message);
    console.error(
      "📋 Detalles del error:",
      error.response
        ? JSON.stringify(error.response.data, null, 2)
        : "No hay datos de respuesta"
    );
    return { success: false, error: error.message };
  }
}

// Función para descargar media de WhatsApp API
// Función para descargar media de WhatsApp API
async function downloadWhatsAppMedia(mediaId) {
  try {
    console.log("📥 Iniciando descarga de media con ID:", mediaId);

    // Usar los valores predeterminados si las variables de entorno no están disponibles
    const apiToken = process.env.WHATSAPP_API_TOKEN || whatsappApiToken;
    const phoneNumberId =
      process.env.WHATSAPP_PHONE_NUMBER_ID || whatsappPhoneNumberId;

    console.log(
      "🔑 Usando token de API de WhatsApp (download):",
      apiToken ? apiToken.substring(0, 10) + "..." : "No disponible"
    );

    if (!apiToken) {
      console.error("❌ Token de API de WhatsApp no configurado");
      throw new Error("Token de API de WhatsApp no configurado");
    }

    // Primero obtenemos la URL del media
    console.log("🔄 Obteniendo URL del media...");
    const mediaResponse = await axios({
      method: "GET",
      url: `https://graph.facebook.com/v18.0/${mediaId}`,
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    console.log("✅ URL del media obtenida:", mediaResponse.data.url);
    const mediaUrl = mediaResponse.data.url;

    // Luego descargamos el contenido del media
    console.log("🔄 Descargando contenido del media...");
    const mediaContent = await axios({
      method: "GET",
      url: mediaUrl,
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      responseType: "arraybuffer",
    });

    console.log("✅ Contenido del media descargado correctamente");
    return {
      success: true,
      data: mediaContent.data,
      contentType: mediaContent.headers["content-type"],
    };
  } catch (error) {
    console.error("❌ Error descargando media:", error.message);
    console.error(
      "📋 Detalles del error:",
      error.response
        ? JSON.stringify(error.response.data, null, 2)
        : "No hay datos de respuesta"
    );
    return {
      success: false,
      error: error.message,
    };
  }
}

// Middleware para verificar firma de las solicitudes de WhatsApp API
async function verifyWhatsAppSignature(req, res, next) {
  try {
    // Usar el valor predeterminado si la variable de entorno no está disponible
    const appSecret =
      process.env.WHATSAPP_APP_SECRET || "09353d1301e356b0cdcba78d2a9c7639";

    console.log(
      "Usando secreto de la aplicación:",
      appSecret ? appSecret.substring(0, 5) + "..." : "No disponible"
    );

    // Verificar si estamos en modo desarrollo (omitir verificación de firma)
    const isDevelopment = process.env.NODE_ENV !== "production";

    console.log("Estamos en modo desarrollo:", isDevelopment);

    if (isDevelopment) {
      console.log("Modo desarrollo: Omitiendo verificación de firma");
      return next();
    }

    console.log("Verificando firma con secreto de la aplicación");

    const signature = req.headers["x-hub-signature-256"];
    if (!signature) {
      console.warn(
        "No se encontró la firma en los headers:",
        JSON.stringify(req.headers)
      );
      return res.status(401).send("No signature found");
    }

    const [algorithm, expectedHash] = signature.split("=");
    if (algorithm !== "sha256") {
      console.warn("Algoritmo de firma no soportado:", algorithm);
      return res.status(401).send("Unsupported signature algorithm");
    }

    // Mostrar el cuerpo de la solicitud para depuración (ten cuidado con datos sensibles)
    console.log("Cuerpo de la solicitud:", JSON.stringify(req.body));

    const body = JSON.stringify(req.body);
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(body);
    const calculatedHash = hmac.digest("hex");

    console.log("Hash calculado completo:", calculatedHash);
    console.log("Hash esperado completo:", expectedHash);

    if (calculatedHash !== expectedHash) {
      console.warn("Firma inválida");
      return res.status(401).send("Invalid signature");
    }

    next();
  } catch (error) {
    console.error("Error verificando firma:", error);
    res.status(500).send("Error verifying signature");
  }
}

// Ruta para verificación del webhook de WhatsApp (ruta /webhook)
whatsappApiApp.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verifyToken = whatsappVerifyToken;

  console.log("Usando token de verificación:", verifyToken);

  if (mode === "subscribe" && token === verifyToken) {
    console.log("Webhook verificado correctamente");
    res.status(200).send(challenge);
  } else {
    console.error("Verificación fallida. Token incorrecto.");
    res.status(403).send("Verificación fallida");
  }
});

// Ruta para verificación del webhook de WhatsApp (ruta raíz /)
whatsappApiApp.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verifyToken = whatsappVerifyToken;

  console.log("Usando token de verificación (ruta raíz):", verifyToken);

  if (mode === "subscribe" && token === verifyToken) {
    console.log("Webhook verificado correctamente en ruta raíz");
    res.status(200).send(challenge);
  } else {
    console.error("Verificación fallida en ruta raíz. Token incorrecto.");
    res.status(403).send("Verificación fallida");
  }
});

// Ruta para procesar mensajes entrantes de WhatsApp en la ruta raíz (/)
// En tu ruta POST principal, modifica la parte de procesamiento de mensajes:
whatsappApiApp.post("/", verifyWhatsAppSignature, async (req, res) => {
  try {
    // Responder rápidamente para evitar timeouts
    res.status(200).send("EVENT_RECEIVED");

    const body = req.body;
    console.log("🔍 Mensaje recibido:", JSON.stringify(body, null, 2));

    // Verificar que sea un mensaje de WhatsApp
    if (!body.object || body.object !== "whatsapp_business_account") {
      console.log("❌ Evento no soportado:", body.object);
      return;
    }

    console.log("✅ Objeto WhatsApp válido, procesando entradas...");

    // Procesar cada entrada
    for (const entry of body.entry) {
      console.log("📝 Procesando entrada:", JSON.stringify(entry, null, 2));

      // Procesar cada cambio
      for (const change of entry.changes) {
        console.log("🔄 Procesando cambio:", change.field);

        if (change.field !== "messages") {
          console.log("⚠️ Campo no soportado:", change.field);
          continue;
        }

        const value = change.value;
        console.log("📋 Valor del cambio:", JSON.stringify(value, null, 2));

        // Guardar la metadata para usar en respuestas
        const metadata = value.metadata || {};

        // Procesar cada mensaje entrante
        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            const from = message.from;
            console.log(
              `📱 Mensaje recibido de ${from} con ID ${message.id} (tipo: ${message.type})`
            );

            // Buscar o crear usuario
            console.log("🔍 Buscando o creando usuario...");
            const user = await findOrCreateUser(from);
            console.log(
              "👤 Usuario encontrado/creado:",
              JSON.stringify(user, null, 2)
            );

            // Procesar según el tipo de mensaje
            if (message.type === "image") {
              console.log("🖼️ Procesando mensaje de imagen...");
              await processImageMessage(message, user, {}, metadata);
            } else if (message.type === "text") {
              console.log("📝 Procesando mensaje de texto...");
              await processTextMessage(message, user, {}, metadata);
            } else {
              console.log(`⚠️ Tipo de mensaje no soportado: ${message.type}`);
              await sendWhatsAppMessage(
                from,
                "Lo siento, solo puedo procesar imágenes de facturas o comandos de texto. Envía 'ayuda' para más información.",
                metadata.phone_number_id
              );
            }
          }
        } else {
          console.log("⚠️ No hay mensajes en el cambio");
        }
      }
    }
  } catch (error) {
    console.error("❌ Error procesando webhook:", error);
  }
});

// Ruta para procesar mensajes entrantes de WhatsApp (ruta /webhook)
whatsappApiApp.post("/webhook", verifyWhatsAppSignature, async (req, res) => {
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
    const configSnapshot = await db
      .collection("system")
      .doc("whatsapp_config")
      .get();
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

          console.log(
            `Procesando mensaje ${messageId} del tipo ${message.type}`
          );

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
}

// Función para procesar mensajes de imagen
async function processImageMessage(message, user, whatsappConfig, metadata) {
  try {
    console.log("🖼️ Iniciando procesamiento de imagen");
    const imageId = message.image.id;
    console.log("🆔 ID de imagen:", imageId);

    // Descargar la imagen
    console.log("📥 Descargando imagen...");
    const mediaResult = await downloadWhatsAppMedia(imageId);
    if (!mediaResult.success) {
      console.error("❌ Error al descargar la imagen:", mediaResult.error);
      await sendWhatsAppMessage(
        user.phone,
        "Lo sentimos, no pudimos procesar tu imagen. Por favor, intenta nuevamente.",
        metadata.phone_number_id // Usar el ID recibido en el mensaje
      );
      return;
    }
    console.log("✅ Imagen descargada correctamente");

    // Procesar la imagen...
    console.log("🔍 Procesando la imagen para extraer información...");

    // Simulación de procesamiento exitoso
    console.log(
      "✅ Imagen procesada correctamente, enviando respuesta al usuario"
    );

    // Enviar respuesta al usuario usando el ID de teléfono recibido
    await sendWhatsAppMessage(
      user.phone,
      "¡Gracias por enviar tu comprobante! Tu compra ha sido registrada correctamente. Has acumulado 10 puntos. Tu total actual es de 50 puntos.",
      metadata.phone_number_id // Usar el ID recibido en el mensaje
    );

    console.log("✅ Respuesta enviada al usuario");
  } catch (error) {
    console.error("❌ Error procesando imagen:", error);
    // ...resto del código de manejo de errores
  }
}

// Función para procesar mensajes de texto
async function processTextMessage(message, user, whatsappConfig, metadata) {
  try {
    const text = message.text.body.toLowerCase().trim();

    // Comando para consultar puntos
    if (text === "puntos") {
      await sendPointsInfo(user, metadata.phone_number_id);
      return;
    }

    // Comando para ayuda
    if (text === "ayuda" || text === "help") {
      await sendHelpInfo(user, metadata.phone_number_id);
      return;
    }

    // Respuesta genérica para otros mensajes
    await sendWhatsAppMessage(
      user.phone,
      "Para registrar un consumo, envía una foto del comprobante de pago. Para consultar tus puntos, envía la palabra 'puntos'.",
      metadata.phone_number_id
    );
  } catch (error) {
    console.error("❌ Error procesando mensaje de texto:", error);
  }
}

// Función para enviar información de puntos al usuario
// Función para enviar información de puntos al usuario
async function sendPointsInfo(user, phoneNumberId) {
  try {
    // Obtener los puntos del cliente en todos los negocios
    const pointsSnapshot = await db
      .collection("client_points")
      .where("userId", "==", user.id)
      .get();

    if (pointsSnapshot.empty) {
      await sendWhatsAppMessage(
        user.phone,
        "Aún no tienes puntos acumulados en ningún negocio. Envía fotos de tus comprobantes de pago para comenzar a acumular puntos.",
        phoneNumberId
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

    message +=
      "\nPara canjear tus puntos, visita el negocio y muestra este mensaje.";

    await sendWhatsAppMessage(user.phone, message, phoneNumberId);
  } catch (error) {
    console.error("Error enviando información de puntos:", error);
  }
}

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
}

export const createPreference = createPref;
export const processWhatsAppAPI = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 300,
    memory: "1GiB",
    // environmentVariables: {
    //   WHATSAPP_API_TOKEN:
    //     "EAAJoZCiJisnoBO1f9v4mv7FRkD5kOJyxF2eNwNLyAuFzRYURV2Jeau3p2ZBd0bbQleo1jbXM4fYiKZANk0GTIwyRaIs1qQ1XJ6Ab1qhIttcLntKq7WUSXZAVS9WDJ2XotSQunELvsoz8xth9ymrCwlEPMxhOiOAMVuPGgLuqaw4jkZC8SvOEVa7fbDuNw2AZDZD",
    //   WHATSAPP_APP_SECRET: "09353d1301e356b0cdcba78d2a9c7639",
    //   WHATSAPP_PHONE_NUMBER_ID: "108512615643697",
    //   WHATSAPP_VERIFY_TOKEN: "38f7d5a1-b65c-4e9d-9f2d-ea9c21b7ca56",
    // },
  },
  whatsappApiApp
);
