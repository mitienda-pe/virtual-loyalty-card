// functions/src/whatsapp/queueProcessor.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const queueService = require("../services/queueService");
const { processImageWithVision } = require("../services/visionService");
const { extractRUCAndAmount } = require("../utils/textExtraction");
const { normalizePhoneNumber } = require("../utils/phoneUtils");
const { sendWhatsAppMessage } = require("./messaging");
const firestoreService = require("../services/firestoreService");

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
        const { imageBuffer, user, phoneNumberId, apiToken } = item.data;
        
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
        
        // Validar que tengamos el número de teléfono del usuario
        if (!user.phone) {
          console.error(`Error en elemento ${item.id}: Número de teléfono no disponible`);
          throw new Error('Número de teléfono del usuario no disponible');
        }
        
        // Normalizar el número de teléfono
        user.phone = normalizePhoneNumber(user.phone);
        console.log(`Teléfono normalizado: ${user.phone}`);
        
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
          const { user, phoneNumberId, apiToken } = item.data;
          
          // Verificar que tengamos un número de teléfono válido
          if (user && user.phone) {
            await sendWhatsAppMessage(
              user.phone,
              "Lo sentimos, hubo un problema al procesar tu comprobante. Por favor, intenta nuevamente con una imagen más clara.",
              phoneNumberId || WHATSAPP_PHONE_NUMBER_ID,
              apiToken || WHATSAPP_API_TOKEN
            );
          } else {
            console.error("No se pudo notificar al usuario: número de teléfono no disponible");
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
  
  if (!user.phone) {
    console.error(`Error en elemento ${queueId}: Número de teléfono no disponible`);
    throw new Error('Número de teléfono del usuario no disponible');
  }
  
  // Normalizar el número de teléfono
  user.phone = normalizePhoneNumber(user.phone);
  console.log(`Teléfono normalizado: ${user.phone}`);
  
  // Procesar la imagen con Google Vision
  console.log("🔍 Procesando imagen con Vision API...");
  let extractedText;
  try {
    extractedText = await processImageWithVision(imageBuffer);
    
    if (!extractedText) {
      console.error("No se pudo extraer texto de la imagen (texto vacío)");
      throw new Error("No se pudo extraer texto de la imagen");
    }
    
    console.log("✅ Texto extraído correctamente de la imagen");
  } catch (visionError) {
    console.error("❌ Error en Vision API:", visionError.message);
    console.error("Detalles del error:", visionError);
    throw new Error(`Error procesando imagen con Vision API: ${visionError.message}`);
  }
  
  console.log("📝 Texto extraído:", extractedText.substring(0, 200) + "...");
  
  // Extraer información relevante del texto
  console.log("🔎 Extrayendo datos del texto...");
  const extractedData = extractRUCAndAmount(extractedText);
  console.log("📊 Datos extraídos:", JSON.stringify(extractedData, null, 2));
  
  // Verificar si tenemos el RUC y monto necesarios
  if (!extractedData.ruc || !extractedData.amount) {
    throw new Error("Información insuficiente en el comprobante");
  }
  
  // Buscar el negocio por RUC en la base de datos
  console.log("🔍 Buscando negocio con RUC:", extractedData.ruc);
  const business = await findBusinessByRUC(extractedData.ruc);
  
  if (!business) {
    throw new Error(`Negocio no registrado con RUC: ${extractedData.ruc}`);
  }
  
  // Usar el slug del negocio desde la base de datos
  extractedData.businessSlug = business.slug || extractedData.businessSlug;
  extractedData.businessName = business.name || extractedData.businessName;
  
  // Verificar si el recibo ya ha sido registrado
  console.log("🔄 Verificando si el comprobante es duplicado...");
  const isDuplicate = await isDuplicateReceipt(
    extractedData.businessSlug,
    user.phone,
    extractedData.amount,
    null,
    {
      ruc: extractedData.ruc,
      invoiceNumber: extractedData.invoiceNumber,
    }
  );
  
  if (isDuplicate) {
    throw new Error("Este comprobante ya ha sido registrado anteriormente");
  }
  
  // Registrar la compra (sin URL de imagen por ahora)
  console.log("💾 Registrando compra en Firestore...");
  const result = await registerPurchase(
    extractedData.businessSlug,
    user.phone,
    extractedData.amount,
    null, // No tenemos URL de imagen en este punto
    {
      ruc: extractedData.ruc,
      invoiceNumber: extractedData.invoiceId,
      businessName: extractedData.businessName,
      address: extractedData.address,
      customerName: user.name || "Cliente",
      verified: true,
      processedFromQueue: true,
      queueId
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
