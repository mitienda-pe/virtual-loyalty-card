// functions/src/whatsapp/queueProcessor.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const queueService = require("../services/queueService");
const { processImageWithVision } = require("../services/visionService");
const { extractRUCAndAmount } = require("../utils/textExtraction");
const { normalizePhoneNumber } = require("../utils/phoneUtils");
const { sendWhatsAppMessage } = require("./messaging");
const firestoreService = require("../services/firestoreService");
const { storeReceiptImage } = require("../services/storageService");

// Alias para funciones de Firestore para mayor legibilidad
const {
  isDuplicateReceipt,
  findOrCreateCustomer,
  registerPurchase,
  getCustomerPointsInfo,
  findBusinessByRUC,
} = firestoreService;

// Usar variables de entorno regulares en lugar de secretos para evitar conflictos
// durante el despliegue con la función processWhatsAppAPI
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

/**
 * Función programada que se ejecuta cada 5 minutos para procesar elementos de la cola
 */
const processQueueItems = onSchedule({
  schedule: "every 5 minutes",
  // Configuración sin secretos, solo variables de entorno
  environmentVariables: {
    WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN || "",
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET || "",
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || ""
  },
  // Especificar Node.js 22 como runtime
  runtime: "nodejs22",
  timeoutSeconds: 540, // 9 minutos (máximo para funciones programadas)
  memory: "1GiB",
}, async (event) => {
  console.log("🔄 Iniciando procesamiento de cola...");
  
  try {
    // Obtener elementos pendientes de la cola
    const pendingItems = await queueService.getPendingItems(5); // Procesar hasta 5 elementos a la vez
    
    if (pendingItems.length === 0) {
      console.log("✅ No hay elementos pendientes en la cola");
      return;
    }
    
    console.log(`🔢 Encontrados ${pendingItems.length} elementos pendientes`);
    
    // Procesar cada elemento
    for (const item of pendingItems) {
      try {
        console.log(`⏳ Procesando elemento ${item.id}...`);
        await queueService.markAsProcessing(item.id);
        
        // Extraer datos del elemento
        const { imageBuffer, user, phoneNumberId, apiToken, metadata } = item.data;
        
        // Validar que tengamos todos los datos necesarios
        if (!imageBuffer) {
          console.error(`Error en elemento ${item.id}: Buffer de imagen no disponible`);
          throw new Error('Buffer de imagen no disponible');
        }
        
        // Validar que tengamos la información del usuario
        if (!user) {
          console.error(`Error en elemento ${item.id}: Información de usuario no disponible`);
          throw new Error('Información de usuario no disponible');
        }
        
        // Obtener el número de teléfono del usuario de múltiples fuentes posibles
        let phoneNumber = null;
        
        // Intentar obtener el teléfono de diferentes lugares para mayor robustez
        if (user.phone) {
          phoneNumber = user.phone;
          console.log(`Teléfono encontrado en user.phone: ${phoneNumber}`);
        } else if (user.phoneNumber) {
          phoneNumber = user.phoneNumber;
          console.log(`Teléfono encontrado en user.phoneNumber: ${phoneNumber}`);
        } else if (metadata && metadata.phoneNumber) {
          phoneNumber = metadata.phoneNumber;
          console.log(`Teléfono encontrado en metadata.phoneNumber: ${phoneNumber}`);
        }
        
        // Validar que tengamos el número de teléfono del usuario
        if (!phoneNumber) {
          console.error(`Error en elemento ${item.id}: Número de teléfono no disponible en ninguna propiedad`);
          throw new Error('Número de teléfono del usuario no disponible');
        }
        
        // Normalizar el número de teléfono y asegurarnos de que esté disponible en todas las propiedades necesarias
        const queueItemPhone = normalizePhoneNumber(phoneNumber);
        user.phone = queueItemPhone;
        user.phoneNumber = queueItemPhone; // Agregar propiedad alternativa
        console.log(`Teléfono normalizado: ${queueItemPhone}`);
        
        // Validar que tengamos el ID del número de teléfono de WhatsApp
        if (!phoneNumberId && !WHATSAPP_PHONE_NUMBER_ID) {
          console.error(`Error en elemento ${item.id}: ID de número de WhatsApp no disponible`);
          throw new Error('ID de número de WhatsApp no disponible');
        }
        
        // Validar que tengamos el token de WhatsApp API
        if (!apiToken && !WHATSAPP_API_TOKEN) {
          console.error(`Error en elemento ${item.id}: Token de WhatsApp API no disponible`);
          throw new Error('Token de WhatsApp API no disponible');
        }
        
        // Procesar la imagen y registrar la compra
        const result = await processQueuedImage(
          item.id,
          imageBuffer, 
          user, 
          phoneNumberId || WHATSAPP_PHONE_NUMBER_ID, 
          apiToken || WHATSAPP_API_TOKEN
        );
        
        // Marcar como completado
        await queueService.markAsCompleted(item.id, result);
        console.log(`✅ Elemento ${item.id} procesado correctamente`);
      } catch (error) {
        console.error(`❌ Error procesando elemento ${item.id}:`, error);
        await queueService.markAsFailed(item.id, error);
        
        // Intentar notificar al usuario sobre el error
        try {
          const { user, phoneNumberId, apiToken, metadata } = item.data;
          
          // Intentar obtener el número de teléfono de varias fuentes posibles
          let phoneNumber = null;
          
          if (user && user.phone) {
            phoneNumber = user.phone;
          } else if (user && user.phoneNumber) {
            phoneNumber = user.phoneNumber;
          } else if (metadata && metadata.phoneNumber) {
            phoneNumber = metadata.phoneNumber;
          }
          
          // Verificar que tengamos un número de teléfono válido
          if (phoneNumber) {
            // Normalizar el número de teléfono antes de enviar el mensaje
            const notificationPhone = normalizePhoneNumber(phoneNumber);
            console.log(`Enviando notificación de error al teléfono: ${notificationPhone}`);
            
            await sendWhatsAppMessage(
              notificationPhone,
              "Lo sentimos, hubo un problema al procesar tu comprobante. Por favor, intenta nuevamente con una imagen más clara.",
              phoneNumberId || WHATSAPP_PHONE_NUMBER_ID,
              apiToken || WHATSAPP_API_TOKEN
            );
          } else {
            console.error("No se pudo notificar al usuario: número de teléfono no disponible en ninguna propiedad");
          }
        } catch (notifyError) {
          console.error("Error al notificar al usuario:", notifyError);
        }
      }
    }
    
    console.log("✅ Procesamiento de cola completado");
  } catch (error) {
    console.error("❌ Error general en el procesamiento de cola:", error);
  }
});

/**
 * Procesa una imagen de la cola
 * @param {string} queueId - ID del elemento en la cola
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {object} user - Información del usuario
 * @param {string} phoneNumberId - ID del número de teléfono de WhatsApp
 * @param {string} apiToken - Token de WhatsApp API
 * @returns {Promise<object>} - Resultado del procesamiento
 */
async function processQueuedImage(queueId, imageBuffer, user, phoneNumberId, apiToken) {
  console.log(`🖼️ Procesando imagen del elemento ${queueId}`);
  
  // Validar datos de entrada
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    console.error(`Error en elemento ${queueId}: Buffer de imagen inválido`);
    throw new Error('Buffer de imagen inválido');
  }
  
  if (!user) {
    console.error(`Error en elemento ${queueId}: Información de usuario no disponible`);
    throw new Error('Información de usuario no disponible');
  }
  
  // Verificar y obtener el número de teléfono del usuario de múltiples fuentes posibles
  let phoneNumber = null;
  
  // Intentar obtener el teléfono de diferentes propiedades
  if (user.phone) {
    phoneNumber = user.phone;
    console.log(`Teléfono encontrado en user.phone: ${phoneNumber}`);
  } else if (user.phoneNumber) {
    phoneNumber = user.phoneNumber;
    console.log(`Teléfono encontrado en user.phoneNumber: ${phoneNumber}`);
  } else if (user.profile && user.profile.phoneNumber) {
    phoneNumber = user.profile.phoneNumber;
    console.log(`Teléfono encontrado en user.profile.phoneNumber: ${phoneNumber}`);
  }
  
  // Validar que tengamos un número de teléfono
  if (!phoneNumber) {
    console.error(`Error en elemento ${queueId}: Número de teléfono no disponible en ninguna propiedad`);
    throw new Error('Número de teléfono del usuario no disponible');
  }
  
  // Normalizar el número de teléfono y asegurarnos de que esté disponible en todas las propiedades necesarias
  const userPhoneNormalized = normalizePhoneNumber(phoneNumber);
  user.phone = userPhoneNormalized;
  user.phoneNumber = userPhoneNormalized; // Agregar propiedad alternativa
  if (!user.profile) user.profile = {};
  user.profile.phoneNumber = userPhoneNormalized; // Agregar al perfil también
  console.log(`Teléfono normalizado: ${userPhoneNormalized}`);
  
  // Procesar la imagen con Google Vision
  console.log("🔍 Procesando imagen con Vision API...");
  let extractedText;
  try {
    extractedText = await processImageWithVision(imageBuffer);
    
    if (!extractedText) {
      console.error("No se pudo extraer texto de la imagen (texto vacío)");
      
      // Almacenar la imagen para análisis posterior, incluso si no se pudo extraer texto
      try {
        await storeReceiptImage(
          imageBuffer,
          "unprocessed", // No tenemos businessSlug aún
          user.phone,
          `queue_error_${queueId}_${Date.now()}`
        );
        console.log("📸 Imagen almacenada para análisis posterior (error de Vision API)");
      } catch (storageError) {
        console.error("⚠️ Error almacenando imagen con error de Vision API:", storageError.message);
        // No interrumpimos el flujo por un error de almacenamiento
      }
      
      throw new Error("No se pudo extraer texto de la imagen");
    }
    
    console.log("✅ Texto extraído correctamente de la imagen");
  } catch (visionError) {
    console.error("❌ Error en Vision API:", visionError.message);
    console.error("Detalles del error:", visionError);
    
    // Almacenar la imagen para análisis posterior en caso de error de Vision API
    try {
      await storeReceiptImage(
        imageBuffer,
        "vision_error", // Carpeta especial para errores de Vision API
        user.phone,
        `queue_error_${queueId}_${Date.now()}`
      );
      console.log("📸 Imagen almacenada para análisis posterior (error de Vision API)");
    } catch (storageError) {
      console.error("⚠️ Error almacenando imagen con error de Vision API:", storageError.message);
      // No interrumpimos el flujo por un error de almacenamiento
    }
    
    throw new Error(`Error procesando imagen con Vision API: ${visionError.message}`);
  }
  
  console.log("📝 Texto extraído:", extractedText.substring(0, 200) + "...");
  
  // Extraer información relevante del texto
  console.log("🔎 Extrayendo datos del texto...");
  const extractedData = extractRUCAndAmount(extractedText);
  console.log("📊 Datos extraídos:", JSON.stringify(extractedData, null, 2));

  // Verificar si tenemos el RUC, monto y número de comprobante necesarios
  if (!extractedData.ruc || !extractedData.amount || !extractedData.invoiceId) {
    // Almacenar la imagen para análisis posterior, incluso si falta información
    try {
      await storeReceiptImage(
        imageBuffer,
        "missing_invoice_number",
        user.phone,
        `queue_missing_invoice_${Date.now()}`
      );
      console.log("📸 Imagen almacenada por falta de número de comprobante");
    } catch (storageError) {
      console.error("⚠️ Error almacenando imagen sin número de comprobante:", storageError.message);
    }

    let missingFields = [];
    if (!extractedData.ruc) missingFields.push('RUC');
    if (!extractedData.amount) missingFields.push('monto');
    if (!extractedData.invoiceId) missingFields.push('número de comprobante');

    // Notificar al usuario
    await sendWhatsAppMessage(
      user.phone,
      `No se pudo registrar tu comprobante porque falta ${missingFields.join(', ')}. Por favor, envía una imagen donde sea claramente visible.`,
      phoneNumberId,
      apiToken
    );
    throw new Error(`Información insuficiente en el comprobante: falta ${missingFields.join(', ')}`);
  }

  // Buscar el negocio por RUC en la base de datos
  console.log("🔍 Buscando negocio con RUC:", extractedData.ruc);
  const business = await findBusinessByRUC(extractedData.ruc);

  if (!business) {
    // Almacenar la imagen para análisis posterior, incluso si el negocio no está registrado
    try {
      await storeReceiptImage(
        imageBuffer,
        "unregistered_business",
        user.phone,
        `queue_ruc_${extractedData.ruc}_${Date.now()}`
      );
      console.log("📸 Imagen almacenada para análisis posterior (negocio no registrado)");
    } catch (storageError) {
      console.error("⚠️ Error almacenando imagen de negocio no registrado:", storageError.message);
      // No interrumpimos el flujo por un error de almacenamiento
    }

    // Notificar al usuario
    await sendWhatsAppMessage(
      user.phone,
      `Lo sentimos, el negocio con RUC ${extractedData.ruc} no está registrado en nuestro sistema.`,
      phoneNumberId,
      apiToken
    );
    throw new Error(`Negocio no registrado con RUC: ${extractedData.ruc}`);
  }

  // Usar el slug del negocio desde la base de datos
  extractedData.businessSlug = business.slug || extractedData.businessSlug;
  extractedData.businessName = business.name || extractedData.businessName;

  // Almacenar la imagen en Firebase Storage
  let receiptImageUrl = null;
  try {
    console.log("📸 Almacenando imagen del recibo en Firebase Storage...");
    const storageResult = await storeReceiptImage(
      imageBuffer,
      extractedData.businessSlug,
      user.phone,
      `queue_ruc_${extractedData.ruc}_${Date.now()}`
    );

    if (storageResult) {
      receiptImageUrl = storageResult.url;
      console.log("✅ Imagen almacenada correctamente:", receiptImageUrl);
    } else {
      console.warn("⚠️ No se pudo almacenar la imagen, continuando sin URL de imagen");
    }
  } catch (storageError) {
    console.error("⚠️ Error almacenando imagen:", storageError.message);
    // No interrumpimos el flujo por un error de almacenamiento
  }

  // Verificar si el recibo ya ha sido registrado (duplicado por número de comprobante y negocio)
  console.log("🔄 Verificando si el comprobante es duplicado...");
  const isDuplicate = await isDuplicateReceipt(
    extractedData.businessSlug,
    user.phone,
    extractedData.amount,
    receiptImageUrl,
    {
      ruc: extractedData.ruc,
      invoiceNumber: extractedData.invoiceId,
    }
  );

  if (isDuplicate) {
    // Almacenar imagen para trazabilidad
    try {
      await storeReceiptImage(
        imageBuffer,
        "duplicate_invoice",
        user.phone,
        `queue_duplicate_invoice_${extractedData.invoiceId}_${Date.now()}`
      );
      console.log("📸 Imagen almacenada por comprobante duplicado");
    } catch (storageError) {
      console.error("⚠️ Error almacenando imagen duplicada:", storageError.message);
    }
    // Notificar al usuario
    await sendWhatsAppMessage(
      user.phone,
      `Este comprobante (N°: ${extractedData.invoiceId}) ya fue registrado anteriormente para este negocio. No se permiten duplicados.`,
      phoneNumberId,
      apiToken
    );
    throw new Error(`Comprobante duplicado: ${extractedData.invoiceId}`);
  }

  // Registrar la compra
  console.log("💾 Registrando compra en Firestore...");
  const result = await registerPurchase(
    extractedData.businessSlug,
    user.phone,
    extractedData.amount,
    receiptImageUrl, // Ahora pasamos la URL de la imagen almacenada
    {
      ruc: extractedData.ruc,
      invoiceNumber: extractedData.invoiceId,
      businessName: extractedData.businessName,
      address: extractedData.address,
      customerName: user.name || "Cliente",
      verified: true,
      processedFromQueue: true,
      queueId,
      hasStoredImage: !!receiptImageUrl // Indicador de si tenemos imagen almacenada
    }
  );
  
  // Normalizar el número de teléfono
  const normalizedPhone = normalizePhoneNumber(user.phone);
  
  // Crear mensaje de confirmación
  const confirmationMessage = `¡Gracias por tu compra en ${
    extractedData.businessName || business.name || extractedData.businessSlug
  }!

🧯 Comprobante registrado correctamente
💰 Monto: S/ ${extractedData.amount}
📍 Dirección: ${
    extractedData.address && extractedData.address !== "CAJA"
      ? extractedData.address
      : "No disponible"
  }

🛍️ Compra registrada exitosamente
🛒 Total de compras: ${result.customer?.purchaseCount || 1}

Ver tu tarjeta de fidelidad: https://asiduo.club/${
    extractedData.businessSlug
  }/${normalizedPhone}`;
  
  // Enviar mensaje de confirmación
  await sendWhatsAppMessage(
    user.phone,
    confirmationMessage,
    phoneNumberId,
    apiToken
  );
  
  return {
    businessSlug: extractedData.businessSlug,
    amount: extractedData.amount,
    purchaseCount: result.customer?.purchaseCount || 1
  };
}

module.exports = {
  processQueueItems,
  processQueuedImage
};
