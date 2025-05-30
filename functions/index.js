// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// Inicializar Firebase Admin si aún no está inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Importar módulos
const {
  verifyWhatsAppSignature,
  sendWhatsAppMessage,
  normalizePhoneNumber,
} = require("./src/whatsapp/messaging");
const {
  processImageMessage,
  processTextMessage,
} = require("./src/whatsapp/processMessages");
const firestoreService = require("./src/services/firestoreService");
const { createPref } = require("./src/mercadopago");
const { processQueueItems } = require("./src/whatsapp/queueProcessor");
const { processImageTask } = require("./src/whatsapp/processImageTask");
const { cleanupImagesScheduled } = require("./src/scheduled/cleanupImages");
const { extractionConfigAPI } = require("./src/api/extractionConfigAPI");

// Pasar la instancia de Firestore al servicio
firestoreService.setFirestoreDb(db);

// Alias para funciones de Firestore para mayor legibilidad
const { findOrCreateCustomer } = firestoreService;

// Definir parámetros de entorno para WhatsApp
// Usar valores directos como se mencionó en las memorias proporcionadas
const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID || "639581415900129"; // Actualizado según el webhook
const WHATSAPP_VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || "38f7d5a1-b65c-4e9d-9f2d-ea9c21b7ca56";
const WHATSAPP_API_TOKEN =
  process.env.WHATSAPP_API_TOKEN ||
  "EAAJoZCiJisnoBO0yyXeggilcH3O4U6pdKulFgixx2O3cRU8TULkI6OWrqeCTLIkUOwQfJjVx9NKKosAOJVbT2QqK43zhYlIF2GAZAUj2fvpSb9T0OMDZB4ZCQL4emlz9nUaFjljmg5iYhHYnSHAezLfz7yBgb3hzudZBRsvFBtpUIZBZCwP9ST6WJQDqdMO4wZDZD";
const WHATSAPP_APP_SECRET =
  process.env.WHATSAPP_APP_SECRET || "09353d1301e356b0cdcba78d2a9c7639";

// Exportar la función de procesamiento de imágenes con Cloud Tasks
exports.processImageTask = processImageTask;

// Exportar la función programada para limpiar imágenes antiguas
exports.cleanupImagesScheduled = cleanupImagesScheduled;

// ✅ NUEVA EXPORTACIÓN DE LA API DE CONFIGURACIÓN
exports.extractionConfigAPI = extractionConfigAPI;

// Función simple para probar que la configuración funciona
exports.helloWorld = onRequest(
  {
    // Configurar variables de entorno explícitamente para mantener consistencia
    environmentVariables: {
      WHATSAPP_API_TOKEN: WHATSAPP_API_TOKEN,
      WHATSAPP_APP_SECRET: WHATSAPP_APP_SECRET,
      WHATSAPP_PHONE_NUMBER_ID: WHATSAPP_PHONE_NUMBER_ID,
      WHATSAPP_VERIFY_TOKEN: WHATSAPP_VERIFY_TOKEN,
    },
    // Especificar Node.js 22 como runtime
    runtime: "nodejs22",
  },
  (req, res) => {
    res.send("Hello from Firebase!");
  }
);

// Exportar la función programada para procesar la cola
exports.processImageQueue = processQueueItems;

// Crear app Express para WhatsApp API
const whatsappApiApp = express();

// Middleware para WhatsApp API
whatsappApiApp.use(cors({ origin: true }));

// Middleware para capturar el cuerpo raw para verificación de firma
whatsappApiApp.use(
  express.json({
    verify: (req, res, buf) => {
      // Guardar el cuerpo raw para verificación de firma
      req.rawBody = buf.toString();
    },
  })
);

// Middleware para verificar la firma de WhatsApp
const verifySignatureMiddleware = async (req, res, next) => {
  try {
    // Imprimir información de depuración
    console.log(`Verificando solicitud ${req.method} a ${req.path}`);
    console.log("Headers:", JSON.stringify(req.headers, null, 2));

    // Pasar directamente el secreto a la función de verificación
    const isValid = await verifyWhatsAppSignature(req, WHATSAPP_APP_SECRET);

    if (!isValid) {
      console.error("Firma de WhatsApp inválida");
      return res.status(403).send("Firma inválida");
    }

    console.log("Verificación de firma exitosa, continuando...");
    next();
  } catch (error) {
    console.error("Error verificando firma:", error);
    res.status(403).send("Error verificando firma");
  }
};

// Ruta principal para el webhook de WhatsApp
whatsappApiApp.post("/", verifySignatureMiddleware, async (req, res) => {
  try {
    // Responder rápidamente para evitar timeouts
    res.status(200).send("EVENT_RECEIVED");

    const body = req.body;

    // Verificar que sea un mensaje de WhatsApp
    if (!body.object || body.object !== "whatsapp_business_account") {
      console.error("Evento no soportado");
      return;
    }

    console.log(
      "Webhook de WhatsApp recibido:",
      JSON.stringify(body, null, 2).substring(0, 500) + "..."
    );

    // Pasar los tokens directamente a las funciones en lugar de usar variables de entorno
    // Esto evita problemas con la propagación de variables de entorno en Cloud Functions

    console.log("Variables de entorno configuradas:", {
      tokenLength: WHATSAPP_API_TOKEN ? WHATSAPP_API_TOKEN.length : 0,
      phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
      secretLength: WHATSAPP_APP_SECRET ? WHATSAPP_APP_SECRET.length : 0,
    });

    // Procesar cada entrada (puede haber múltiples en un solo webhook)
    for (const entry of body.entry) {
      // Procesar cada cambio en la entrada
      for (const change of entry.changes) {
        // Verificar que sea un mensaje
        if (change.field === "messages") {
          const value = change.value;

          // Procesar cada mensaje
          for (const message of value.messages || []) {
            try {
              // Obtener información del contacto
              const contact = value.contacts[0];
              const phone = contact.wa_id;
              const name = contact.profile.name || "Cliente";

              console.log(
                `Mensaje recibido de ${name} (${phone}): Tipo: ${message.type}`
              );

              // Buscar o crear usuario
              const user = await findOrCreateCustomer(phone, name);

              // Procesar según el tipo de mensaje
              if (message.type === "image") {
                // Si es una imagen, asumimos que es un comprobante de pago
                // Enviar mensaje de confirmación inmediato
                await sendWhatsAppMessage(
                  phone,
                  "Estamos procesando tu comprobante. Por favor, espera un momento...",
                  WHATSAPP_PHONE_NUMBER_ID,
                  WHATSAPP_API_TOKEN
                );

                // Procesar la imagen (no esperamos a que termine)
                try {
                  // Asegurarse de que el usuario tenga la propiedad phone
                  if (!user.phone && phone) {
                    user.phone = phone;
                    console.log(
                      `Asignando número de teléfono al objeto usuario: ${phone}`
                    );
                  }

                  // Procesar la imagen (no esperamos a que termine)
                  processImageMessage(
                    message,
                    user,
                    WHATSAPP_PHONE_NUMBER_ID,
                    WHATSAPP_API_TOKEN
                  ).catch((err) => {
                    console.error("Error procesando imagen:", err);

                    // Intentar enviar un mensaje de error al usuario
                    if (phone) {
                      sendWhatsAppMessage(
                        phone,
                        "Hubo un problema al procesar tu imagen. Por favor, intenta nuevamente con una foto más clara del comprobante.",
                        WHATSAPP_PHONE_NUMBER_ID,
                        WHATSAPP_API_TOKEN
                      ).catch((msgErr) =>
                        console.error(
                          "Error enviando mensaje de error:",
                          msgErr
                        )
                      );
                    }
                  });
                } catch (error) {
                  console.error(
                    "Error general en el manejo de imágenes:",
                    error
                  );
                }
              } else if (message.type === "text") {
                // Si es un texto, procesamos comandos o consultas
                processTextMessage(
                  message,
                  user,
                  WHATSAPP_PHONE_NUMBER_ID,
                  WHATSAPP_API_TOKEN
                ).catch((err) => console.error("Error procesando texto:", err));
              } else {
                // Para otros tipos de mensajes, enviamos una respuesta genérica
                sendWhatsAppMessage(
                  phone,
                  '¡Gracias por tu mensaje! Para registrar un consumo, envía una foto del comprobante de pago. Para consultar tus puntos, envía la palabra "puntos".',
                  WHATSAPP_PHONE_NUMBER_ID,
                  WHATSAPP_API_TOKEN
                ).catch((err) =>
                  console.error("Error enviando mensaje genérico:", err)
                );
              }
            } catch (messageError) {
              console.error(
                "Error procesando mensaje individual:",
                messageError
              );
              // Continuar con el siguiente mensaje
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error procesando webhook:", error);
    // Ya hemos enviado la respuesta, así que no necesitamos enviar otra
  }
});

/**
 * Procesa el webhook de WhatsApp de forma asíncrona
 * @param {object} body - Cuerpo del webhook
 * @param {string} phoneNumberId - ID del número de teléfono de WhatsApp
 * @returns {Promise<void>}
 */
async function processWebhookAsync(body, phoneNumberId) {
  try {
    console.log("📡 Procesando webhook de WhatsApp de forma asíncrona");

    // Procesar cada entrada (puede haber múltiples en un solo webhook)
    for (const entry of body.entry) {
      // Procesar cada cambio en la entrada
      for (const change of entry.changes) {
        // Verificar que sea un mensaje
        if (change.field === "messages") {
          const value = change.value;

          // Procesar cada mensaje
          for (const message of value.messages || []) {
            try {
              // Obtener información del contacto
              const contact = value.contacts[0];
              const phone = contact.wa_id;
              const name = contact.profile.name || "Cliente";

              console.log(
                `💬 Mensaje recibido de ${name} (${phone}): Tipo: ${message.type}`
              );

              // Buscar o crear usuario con timeout
              console.log("🔍 Buscando o creando usuario...");
              const userPromise = findOrCreateCustomer(phone, name);
              const user = await Promise.race([
                userPromise,
                new Promise((_, reject) =>
                  setTimeout(
                    () => reject(new Error("Timeout buscando usuario")),
                    5000
                  )
                ),
              ]);

              // Procesar según el tipo de mensaje
              switch (message.type) {
                case "image":
                  console.log("🖼️ Procesando imagen...");
                  // Si es una imagen, asumimos que es un comprobante de pago
                  // Procesar de forma asíncrona para evitar bloquear el webhook
                  processImageMessage(message, user, phoneNumberId).catch(
                    (error) => {
                      console.error("Error procesando imagen:", error);
                    }
                  );
                  break;

                case "text":
                  console.log("💬 Procesando texto...");
                  // Si es un texto, procesamos comandos o consultas
                  processTextMessage(message, user, phoneNumberId).catch(
                    (error) => {
                      console.error("Error procesando texto:", error);
                    }
                  );
                  break;

                default:
                  // Para otros tipos de mensajes, enviamos una respuesta genérica
                  sendWhatsAppMessage(
                    phone,
                    '¡Gracias por tu mensaje! Para registrar un consumo, envía una foto del comprobante de pago. Para consultar tus puntos, envía la palabra "puntos".',
                    phoneNumberId
                  ).catch((error) => {
                    console.error("Error enviando mensaje genérico:", error);
                  });
              }
            } catch (messageError) {
              console.error(
                "Error procesando mensaje individual:",
                messageError
              );
              // Continuar con el siguiente mensaje
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error en procesamiento asíncrono:", error);
  }
}

// Ruta para verificación del webhook (GET request)
whatsappApiApp.get("/", (req, res) => {
  // Parámetros que envía WhatsApp
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Verificar que el token coincida con nuestro token de verificación
  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente");
    res.status(200).send(challenge);
  } else {
    console.error("Verificación fallida. Token inválido.");
    res.sendStatus(403);
  }
});

// Exportar la función de WhatsApp API usando correctamente la sintaxis de Firebase Functions v2
exports.processWhatsAppAPI = onRequest(
  {
    // Configurar variables de entorno directamente en la definición de la función
    environmentVariables: {
      WHATSAPP_API_TOKEN: WHATSAPP_API_TOKEN,
      WHATSAPP_APP_SECRET: WHATSAPP_APP_SECRET,
      WHATSAPP_PHONE_NUMBER_ID: WHATSAPP_PHONE_NUMBER_ID,
      WHATSAPP_VERIFY_TOKEN: WHATSAPP_VERIFY_TOKEN,
    },
    // Especificar Node.js 22 como runtime
    runtime: "nodejs22",
  },
  whatsappApiApp
);

// Exportar la función de Mercado Pago
exports.createPreference = createPref;