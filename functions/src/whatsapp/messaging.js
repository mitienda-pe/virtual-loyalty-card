// functions/src/whatsapp/messaging.js
const axios = require('axios');
const { normalizePhoneNumber } = require('../utils/phoneUtils');

// Configuración de WhatsApp API
const WHATSAPP_API_VERSION = "v18.0";
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

/**
 * Envía un mensaje de WhatsApp a un número de teléfono
 * @param {string} phone - Número de teléfono del destinatario
 * @param {string} message - Mensaje a enviar
 * @param {string} phoneNumberId - ID del número de teléfono de WhatsApp
 * @param {string} [apiToken] - Token de autenticación de WhatsApp API (opcional)
 * @returns {Promise<object>} - Respuesta de la API de WhatsApp
 */
async function sendWhatsAppMessage(phone, message, phoneNumberId, apiToken = null) {
  try {
    // Validar que tengamos un número de teléfono
    if (!phone) {
      console.error("Error: Número de teléfono no proporcionado en sendWhatsAppMessage");
      throw new Error("Número de teléfono requerido para enviar mensaje");
    }
    
    // Validar que tengamos un mensaje
    if (!message) {
      console.error("Error: Mensaje no proporcionado en sendWhatsAppMessage");
      throw new Error("Mensaje requerido para enviar mensaje");
    }
    
    // Validar que tengamos un ID de número de teléfono de WhatsApp
    if (!phoneNumberId) {
      console.error("Error: ID de número de teléfono de WhatsApp no proporcionado en sendWhatsAppMessage");
      throw new Error("ID de número de teléfono de WhatsApp requerido para enviar mensaje");
    }
    
    // Usar el token proporcionado o acceder a las variables de entorno
    const token = apiToken || process.env.WHATSAPP_API_TOKEN;
    
    if (!token) {
      console.error("Token de WhatsApp API no disponible en sendWhatsAppMessage");
      console.error("Variables de entorno disponibles:", Object.keys(process.env).filter(key => key.includes('WHATSAPP')));
      throw new Error("Token de WhatsApp API no disponible");
    }
    
    // Normalizar el número de teléfono para asegurar que tenga el formato correcto
    const normalizedPhone = normalizePhoneNumber(phone);
    
    // Construir la URL para enviar el mensaje
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
    
    // Construir el payload del mensaje
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedPhone,
      type: "text",
      text: {
        preview_url: true,
        body: message
      }
    };
    
    // Configurar los headers con el token de autenticación
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
    
    // Enviar la solicitud a la API de WhatsApp
    const response = await axios.post(url, payload, { headers });
    
    console.log(`✅ Mensaje enviado a ${normalizedPhone}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error enviando mensaje de WhatsApp:", error.message);
    if (error.response) {
      console.error("Detalles del error:", error.response.data);
    }
    throw error;
  }
}

/**
 * Descarga el contenido multimedia de WhatsApp
 * @param {string} mediaId - ID del archivo multimedia
 * @param {string} [apiToken] - Token de autenticación de WhatsApp API (opcional)
 * @returns {Promise<Buffer>} - Buffer con el contenido del archivo
 */
async function downloadWhatsAppMedia(mediaId, apiToken = null) {
  try {
    // Usar el token proporcionado o acceder a las variables de entorno
    const token = apiToken || process.env.WHATSAPP_API_TOKEN;
    
    if (!token) {
      console.error("Token de WhatsApp API no disponible en downloadWhatsAppMedia");
      console.error("Variables de entorno disponibles:", Object.keys(process.env).filter(key => key.includes('WHATSAPP')));
      throw new Error("Token de WhatsApp API no disponible");
    }
    
    // Obtener la URL del archivo multimedia
    const mediaUrl = await getMediaUrl(mediaId, token);
    
    // Descargar el archivo
    const response = await axios.get(mediaUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      responseType: 'arraybuffer'
    });
    
    // Convertir la respuesta a un buffer para procesamiento posterior
    const buffer = Buffer.from(response.data, 'binary');
    
    console.log(`✅ Archivo multimedia descargado: ${mediaId}`);
    return buffer;
  } catch (error) {
    console.error("❌ Error descargando archivo multimedia:", error.message);
    if (error.response) {
      console.error("Detalles del error:", error.response.data);
    }
    throw error;
  }
}

/**
 * Obtiene la URL de un archivo multimedia de WhatsApp
 * @param {string} mediaId - ID del archivo multimedia
 * @param {string} [apiToken] - Token de autenticación de WhatsApp API (opcional)
 * @returns {Promise<string>} - URL del archivo multimedia
 */
async function getMediaUrl(mediaId, apiToken = null) {
  try {
    // Obtener el token de autenticación de las variables de entorno
    const token = process.env.WHATSAPP_API_TOKEN;
    
    if (!token) {
      console.error("Token de WhatsApp API no disponible en getMediaUrl");
      console.error("Variables de entorno disponibles:", Object.keys(process.env).filter(key => key.includes('WHATSAPP')));
      console.warn("⚠️ Continuando sin token, pero la funcionalidad estará limitada");
      // Retornar null en lugar de lanzar un error para permitir que el flujo continúe
      return null;
    }
    
    // Construir la URL para obtener la información del archivo
    const url = `${WHATSAPP_API_URL}/${mediaId}`;
    
    // Configurar los headers con el token de autenticación
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
    
    // Enviar la solicitud a la API de WhatsApp
    const response = await axios.get(url, { headers });
    
    // Retornar la URL del archivo
    return response.data.url;
  } catch (error) {
    console.error("❌ Error obteniendo URL de archivo multimedia:", error.message);
    if (error.response) {
      console.error("Detalles del error:", error.response.data);
    }
    // Retornar null en lugar de lanzar un error
    console.warn("⚠️ No se pudo obtener la URL del archivo, continuando con funcionalidad limitada");
    return null;
  }
}


/**
 * Verifica la firma de una solicitud de WhatsApp
 * @param {object} req - Objeto de solicitud
 * @param {string} appSecret - Secreto de la aplicación de WhatsApp
 * @returns {Promise<boolean>} - true si la firma es válida, false en caso contrario
 */
async function verifyWhatsAppSignature(req, appSecret) {
  try {
    // Para solicitudes GET (verificación de webhook), no necesitamos verificar la firma
    if (req.method === 'GET') {
      console.log("Solicitud GET, no se requiere verificación de firma");
      return true;
    }
    
    // Verificar que tengamos el encabezado de firma
    const signature = req.headers['x-hub-signature-256'];
    if (!signature || !signature.startsWith('sha256=')) {
      console.error("Encabezado de firma no encontrado o formato incorrecto");
      
      // En modo desarrollo, permitir solicitudes sin firma
      if (process.env.NODE_ENV === 'development') {
        console.log("Modo desarrollo: permitiendo solicitud sin firma");
        return true;
      }
      
      return false;
    }
    
    // Extraer el hash esperado
    const expectedHash = signature.substring(7); // Eliminar 'sha256='
    
    // Verificar que tengamos el cuerpo de la solicitud
    if (!req.rawBody) {
      console.error("No se encontró el cuerpo raw de la solicitud");
      return false;
    }
    
    // Calcular el hash con el cuerpo de la solicitud
    const crypto = require('crypto');
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(req.rawBody);
    const calculatedHash = hmac.digest("hex");
    
    // Comparar los hashes
    const isValid = calculatedHash === expectedHash;
    
    if (isValid) {
      console.log("✅ Verificación de firma exitosa");
    } else {
      console.error("❌ Verificación de firma fallida");
      console.log("Hash esperado:", expectedHash);
      console.log("Hash calculado:", calculatedHash);
      console.log("Secreto usado:", appSecret.substring(0, 5) + '...');
      console.log("Primeros 50 caracteres del cuerpo:", req.rawBody.substring(0, 50));
    }
    
    return isValid;
  } catch (error) {
    console.error("Error verificando firma:", error);
    return false;
  }
}

module.exports = {
  sendWhatsAppMessage,
  downloadWhatsAppMedia,
  getMediaUrl,
  normalizePhoneNumber,
  verifyWhatsAppSignature
};
