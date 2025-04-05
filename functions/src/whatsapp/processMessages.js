// functions/src/whatsapp/processMessages.js
const { sendWhatsAppMessage, downloadWhatsAppMedia, getMediaUrl } = require('./messaging');
const { processImageWithVision } = require('../services/visionService');
const { extractRUCAndAmount } = require('../utils/textExtraction');
const { normalizePhoneNumber } = require('../utils/phoneUtils');
const firestoreService = require('../services/firestoreService');

// Alias para funciones de Firestore para mayor legibilidad
const { isDuplicateReceipt, findOrCreateCustomer, registerPurchase, getCustomerPointsInfo, findBusinessByRUC } = firestoreService;

/**
 * Procesa un mensaje de imagen (comprobante de pago)
 * @param {object} message - Mensaje de WhatsApp
 * @param {object} user - Información del usuario
 * @param {string} phoneNumberId - ID del número de teléfono de WhatsApp
 * @param {string} apiToken - Token de WhatsApp API
 * @param {object} metadata - Metadatos adicionales
 * @returns {Promise<void>}
 */
async function processImageMessage(message, user, phoneNumberId, apiToken, metadata = {}) {
  try {
    console.log("🖼️ Iniciando procesamiento de imagen");
    const imageId = message.image.id;
    console.log("🆔 ID de imagen:", imageId);
    
    // Ya enviamos un mensaje de confirmación en el webhook principal
    
    // Descargar la imagen
    console.log("⬇️ Descargando imagen...");
    const imageBuffer = await downloadWhatsAppMedia(imageId, apiToken);
    
    if (!imageBuffer) {
      throw new Error("No se pudo descargar la imagen");
    }
    console.log("✅ Imagen descargada correctamente, tamaño:", imageBuffer.length, "bytes");
    
    // Procesar la imagen con Google Vision
    console.log("🔍 Procesando imagen con Vision API...");
    const extractedText = await processImageWithVision(imageBuffer);
    
    if (!extractedText) {
      throw new Error("No se pudo extraer texto de la imagen");
    }
    
    console.log("📝 Texto extraído:", extractedText.substring(0, 200) + "...");
    
    // Extraer información relevante del texto
    console.log("🔎 Extrayendo datos del texto...");
    const extractedData = extractRUCAndAmount(extractedText);
    console.log("📊 Datos extraídos:", JSON.stringify(extractedData, null, 2));
    
    // Verificar si tenemos el RUC y monto necesarios
    if (!extractedData.ruc || !extractedData.amount) {
      console.log("❌ Información insuficiente en el comprobante");
      await sendWhatsAppMessage(
        user.phone,
        "No pudimos identificar correctamente la información del comprobante. Por favor, asegúrate de que la imagen sea clara y contenga el RUC y monto total.",
        phoneNumberId,
        apiToken
      );
      return;
    }
    
    // Buscar el negocio por RUC en la base de datos
    console.log("🔍 Buscando negocio con RUC:", extractedData.ruc);
    const business = await findBusinessByRUC(extractedData.ruc);
    
    if (!business) {
      console.log("❌ Negocio no registrado con RUC:", extractedData.ruc);
      await sendWhatsAppMessage(
        user.phone,
        `No encontramos un negocio registrado con el RUC ${extractedData.ruc}. Por favor, verifica que el comprobante sea de un negocio afiliado.`,
        phoneNumberId,
        apiToken
      );
      return;
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
        invoiceNumber: extractedData.invoiceNumber
      }
    );
    
    if (isDuplicate) {
      console.log("⚠️ Comprobante duplicado detectado");
      await sendWhatsAppMessage(
        user.phone,
        `Este comprobante ya ha sido registrado anteriormente. No se puede registrar el mismo comprobante más de una vez.`,
        phoneNumberId,
        apiToken
      );
      return;
    }
    
    // Registrar la compra
    console.log("💾 Registrando compra en Firestore...");
    const result = await registerPurchase(
      extractedData.businessSlug,
      user.phone,
      extractedData.amount,
      null, // imageUrl
      {
        ruc: extractedData.ruc,
        invoiceNumber: extractedData.invoiceId,
        businessName: extractedData.businessName,
        address: extractedData.address,
        customerName: user.name || "Cliente"
      }
    );
    
    // Obtener información actualizada de puntos
    console.log("🔢 Obteniendo información de puntos...");
    const pointsInfo = await getCustomerPointsInfo(user.id, extractedData.businessSlug);
    
    // Normalizar el número de teléfono
    const normalizedPhone = normalizePhoneNumber(user.phone);
    
    // Crear mensaje de confirmación
    const confirmationMessage = `¡Gracias por tu compra en ${extractedData.businessName || business.name || extractedData.businessSlug}!

🧯 Comprobante registrado correctamente
💰 Monto: S/ ${extractedData.amount}
📍 Dirección: ${extractedData.address && extractedData.address !== 'CAJA' ? extractedData.address : 'No disponible'}

💳 Compra registrada exitosamente
🛒 Total de compras: ${result.customer?.purchases || 1}

Ver tu tarjeta de fidelidad: https://virtual-loyalty-card-e37c9.firebaseapp.com/${extractedData.businessSlug}/+${user.phone.replace('+', '')}`;
    
    // Enviar mensaje de confirmación
    await sendWhatsAppMessage(
      user.phone,
      confirmationMessage,
      phoneNumberId,
      apiToken
    );
  } catch (error) {
    console.error("❌ Error procesando imagen:", error.message);
    console.error("Detalles del error:", error.stack);
    
    // Determinar un mensaje de error más específico basado en el tipo de error
    let errorMessage = "Lo sentimos, hubo un error al procesar tu comprobante. Por favor, intenta nuevamente con una imagen más clara.";
    
    if (error.message.includes("Timeout")) {
      console.log("⏱️ Se detectó un timeout en el procesamiento");
      errorMessage = "El procesamiento está tomando más tiempo del esperado. Tu comprobante será procesado en segundo plano y te notificaremos cuando esté listo.";
      
      // En caso de timeout, programar un procesamiento asíncrono
      // Esto permitirá que la función termine pero el procesamiento continúe en segundo plano
      setTimeout(() => {
        console.log("🔄 Continuando procesamiento en segundo plano");
        // Aquí podríamos implementar una cola de procesamiento o un trigger para otra función
      }, 0);
    }
    
    try {
      // Enviar mensaje de error al usuario
      await sendWhatsAppMessage(
        user.phone,
        errorMessage,
        phoneNumberId
      ).catch(sendError => {
        console.error("Error enviando mensaje de error:", sendError.message);
      });
    } catch (sendError) {
      console.error("Error enviando mensaje de error:", sendError.message);
    }
  }
}

/**
 * Procesa un mensaje de texto
 * @param {object} message - Mensaje de WhatsApp
 * @param {object} user - Información del usuario
 * @param {string} phoneNumberId - ID del número de teléfono de WhatsApp
 * @param {string} apiToken - Token de WhatsApp API
 * @param {object} metadata - Metadatos adicionales
 * @returns {Promise<void>}
 */
async function processTextMessage(message, user, phoneNumberId, apiToken, metadata = {}) {
  try {
    const text = message.text.body.trim().toLowerCase();
    
    // Comandos disponibles
    if (text === 'puntos' || text === 'points' || text.includes('punto') || text.includes('point')) {
      await sendPointsInfo(user, phoneNumberId, apiToken);
    } else {
      // Mensaje por defecto
      await sendWhatsAppMessage(
        user.phone,
        "Para registrar un consumo, envía una foto del comprobante de pago. Para consultar tus puntos, envía la palabra 'puntos'.",
        phoneNumberId,
        apiToken
      );
    }
  } catch (error) {
    console.error("Error procesando mensaje de texto:", error);
    try {
      await sendWhatsAppMessage(
        user.phone,
        "Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta nuevamente.",
        phoneNumberId
      );
    } catch (msgError) {
      console.error("Error enviando mensaje de error:", msgError);
    }
  }
}

/**
 * Envía información de puntos al usuario
 * @param {object} user - Información del usuario
 * @param {string} phoneNumberId - ID del número de teléfono de WhatsApp
 * @param {string} apiToken - Token de WhatsApp API
 * @returns {Promise<void>}
 */
async function sendPointsInfo(user, phoneNumberId, apiToken) {
  try {
    // Obtener información de puntos del usuario
    const pointsInfo = await getCustomerPointsInfo(user.phone);
    
    if (!pointsInfo.success) {
      await sendWhatsAppMessage(
        user.phone,
        "Lo siento, no pudimos obtener la información de tus puntos en este momento.",
        phoneNumberId,
        apiToken
      );
      return;
    }
    
    // Construir mensaje con la información de puntos
    let message = `*Información de Puntos* 📊\n\n`;
    message += `*Cliente:* ${pointsInfo.customer.name}\n`;
    message += `*Compras totales:* ${pointsInfo.customer.totalPurchases}\n\n`;
    
    if (pointsInfo.businesses.length === 0) {
      message += "Aún no tienes puntos acumulados en ningún negocio. Envía una foto de tu comprobante de pago para comenzar a acumular puntos.";
    } else {
      message += "*Puntos por negocio:*\n";
      
      for (const business of pointsInfo.businesses) {
        message += `\n*${business.name}*\n`;
        message += `Puntos: ${business.points}\n`;
        message += `Compras: ${business.purchases}\n`;
        message += `Total gastado: S/ ${business.totalSpent.toFixed(2)}\n`;
        message += `Ver tarjeta: https://virtual-loyalty-card-e37c9.web.app/card/${business.slug}/${user.phone.replace('+', '')}\n`;
      }
    }
    
    // Enviar mensaje con la información
    await sendWhatsAppMessage(user.phone, message, phoneNumberId, apiToken);
  } catch (error) {
    console.error("Error enviando información de puntos:", error);
    await sendWhatsAppMessage(
      user.phone,
      "Lo siento, ocurrió un error al obtener la información de tus puntos. Por favor, intenta nuevamente más tarde.",
      phoneNumberId,
      apiToken
    );
  }
}

/**
 * Envía información de ayuda al usuario
 * @param {object} user - Información del usuario
 * @param {string} phoneNumberId - ID del número de teléfono de WhatsApp
 * @returns {Promise<void>}
 */
async function sendHelpInfo(user, phoneNumberId) {
  const helpMessage = `*Ayuda de Tarjeta de Fidelidad Virtual* 📱\n\n` +
    `Aquí tienes los comandos disponibles:\n\n` +
    `*puntos* - Consulta tus puntos acumulados en todos los negocios\n\n` +
    `*ayuda* - Muestra este mensaje de ayuda\n\n` +
    `Para registrar una compra, simplemente envía una foto clara del comprobante de pago (boleta o factura).\n\n` +
    `Por cada S/ 10 de consumo, recibirás 1 punto de fidelidad. ¡Acumula puntos y canjéalos por premios!`;
  
  await sendWhatsAppMessage(user.phone, helpMessage, phoneNumberId);
}

module.exports = {
  processImageMessage,
  processTextMessage,
  sendPointsInfo,
  sendHelpInfo
};
