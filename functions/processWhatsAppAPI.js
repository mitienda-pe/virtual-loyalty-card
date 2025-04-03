// functions/processWhatsAppAPI.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const crypto = require('crypto');

// Inicializar Firebase Admin si aún no está inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Función que procesa los mensajes entrantes de WhatsApp
 * Esta función se despliega como un webhook en Firebase Functions
 */
exports.processWhatsAppAPI = functions.https.onRequest(async (req, res) => {
  // Verificación del webhook (GET request)
  if (req.method === 'GET') {
    // Token de verificación configurado en la plataforma de WhatsApp
    const VERIFY_TOKEN = '38f7d5a1-b65c-4e9d-9f2d-ea9c21b7ca56';
    
    // Parámetros que envía WhatsApp
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // Verificar que el token coincida con nuestro token de verificación
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verificado correctamente');
      res.status(200).send(challenge);
    } else {
      console.error('Verificación fallida. Token incorrecto.');
      res.status(403).send('Verificación fallida');
    }
    return;
  }
  
  // Procesar mensajes entrantes (POST request)
  if (req.method === 'POST') {
    try {
      // Verificar firma de WhatsApp para seguridad
      const isValid = await verifyWhatsAppSignature(req);
      if (!isValid) {
        console.error('Firma de WhatsApp inválida');
        return res.status(403).send('Firma inválida');
      }
      
      const body = req.body;
      
      // Verificar que sea un mensaje de WhatsApp
      if (!body.object || body.object !== 'whatsapp_business_account') {
        return res.status(400).send('Evento no soportado');
      }
      
      // Obtener la configuración de WhatsApp desde Firestore
      const whatsappConfig = await getWhatsAppConfig();
      if (!whatsappConfig) {
        console.error('No se encontró la configuración de WhatsApp');
        return res.status(500).send('Error de configuración');
      }
      
      // Procesar cada entrada (puede haber múltiples en un solo webhook)
      for (const entry of body.entry) {
        // Procesar cada cambio en la entrada
        for (const change of entry.changes) {
          // Verificar que sea un mensaje
          if (change.field === 'messages') {
            // Procesar cada mensaje
            for (const message of change.value.messages || []) {
              await processMessage(message, change.value.contacts[0], whatsappConfig);
            }
          }
        }
      }
      
      // Responder con éxito al webhook de WhatsApp
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error procesando webhook:', error);
      res.status(500).send('Error interno del servidor');
    }
  } else {
    // Método no soportado
    res.status(405).send('Método no permitido');
  }
});

/**
 * Verifica la firma de WhatsApp para asegurar que la solicitud es auténtica
 */
async function verifyWhatsAppSignature(req) {
  try {
    const whatsappConfig = await getWhatsAppConfig();
    if (!whatsappConfig || !whatsappConfig.appSecret) {
      console.error('No se encontró el secreto de la aplicación de WhatsApp');
      return false;
    }
    
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      console.error('No se encontró la firma en los headers');
      return false;
    }
    
    const [algorithm, expectedHash] = signature.split('=');
    if (algorithm !== 'sha256') {
      console.error('Algoritmo de firma no soportado');
      return false;
    }
    
    const body = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', whatsappConfig.appSecret);
    hmac.update(body);
    const calculatedHash = hmac.digest('hex');
    
    return calculatedHash === expectedHash;
  } catch (error) {
    console.error('Error verificando firma:', error);
    return false;
  }
}

/**
 * Obtiene la configuración de WhatsApp desde Firestore
 */
async function getWhatsAppConfig() {
  try {
    const configDoc = await db.collection('system').doc('whatsapp_config').get();
    if (!configDoc.exists) {
      return null;
    }
    return configDoc.data();
  } catch (error) {
    console.error('Error obteniendo configuración de WhatsApp:', error);
    return null;
  }
}

/**
 * Procesa un mensaje entrante de WhatsApp
 */
async function processMessage(message, contact, whatsappConfig) {
  try {
    const phone = contact.wa_id;
    const name = contact.profile.name || 'Cliente';
    
    console.log(`Mensaje recibido de ${name} (${phone}): Tipo: ${message.type}`);
    
    // Verificar si el usuario ya existe
    let user = await findOrCreateUser(phone, name);
    
    // Procesar según el tipo de mensaje
    switch (message.type) {
      case 'image':
        // Si es una imagen, asumimos que es un comprobante de pago
        await processReceiptImage(message, user, whatsappConfig);
        break;
      
      case 'text':
        // Si es un texto, procesamos comandos o consultas
        await processTextMessage(message, user, whatsappConfig);
        break;
      
      default:
        // Para otros tipos de mensajes, enviamos una respuesta genérica
        await sendWhatsAppMessage(
          phone, 
          '¡Gracias por tu mensaje! Para registrar un consumo, envía una foto del comprobante de pago. Para consultar tus puntos, envía la palabra "puntos".',
          whatsappConfig
        );
    }
  } catch (error) {
    console.error('Error procesando mensaje:', error);
  }
}

/**
 * Busca o crea un usuario basado en su número de teléfono
 */
async function findOrCreateUser(phone, name) {
  try {
    // Buscar usuario por teléfono
    const usersSnapshot = await db.collection('users')
      .where('phone', '==', phone)
      .limit(1)
      .get();
    
    // Si el usuario existe, retornarlo
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0].data();
      return {
        id: usersSnapshot.docs[0].id,
        ...userData
      };
    }
    
    // Si no existe, crear un nuevo usuario
    const newUser = {
      displayName: name,
      phone: phone,
      role: 'business-client',
      registeredVia: 'whatsapp',
      disabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const userRef = await db.collection('users').add(newUser);
    
    console.log(`Nuevo usuario creado: ${userRef.id}`);
    
    return {
      id: userRef.id,
      ...newUser
    };
  } catch (error) {
    console.error('Error buscando/creando usuario:', error);
    throw error;
  }
}

/**
 * Procesa una imagen de comprobante de pago
 */
async function processReceiptImage(message, user, whatsappConfig) {
  try {
    // En un escenario real, aquí procesaríamos la imagen para extraer información
    // como el monto, la fecha, el negocio, etc.
    // Por ahora, simularemos este proceso
    
    // Obtener la URL de la imagen
    const imageId = message.image.id;
    const imageUrl = await getMediaUrl(imageId, whatsappConfig);
    
    // Simular procesamiento de la imagen
    const businessId = await getRandomBusiness();
    const amount = Math.floor(Math.random() * 100) + 20; // Monto aleatorio entre 20 y 120
    
    // Registrar la transacción
    const transactionId = await registerTransaction(user.id, businessId, amount, imageUrl);
    
    // Obtener información del negocio
    const business = await getBusinessInfo(businessId);
    
    // Calcular puntos (1 punto por cada 10 unidades monetarias)
    const points = Math.floor(amount / 10);
    
    // Actualizar puntos del cliente
    await updateClientPoints(user.id, businessId, points);
    
    // Enviar confirmación al cliente
    const message = `¡Gracias por tu compra en ${business.name}! 
    
📝 Detalles:
- Monto: $${amount}
- Puntos ganados: ${points}
- Total de puntos: ${await getTotalPoints(user.id, businessId)}

Puedes consultar tus puntos enviando la palabra "puntos".`;
    
    await sendWhatsAppMessage(user.phone, message, whatsappConfig);
  } catch (error) {
    console.error('Error procesando imagen de comprobante:', error);
    
    // Enviar mensaje de error al cliente
    await sendWhatsAppMessage(
      user.phone, 
      'Lo sentimos, hubo un problema procesando tu comprobante. Por favor, intenta nuevamente o contacta al negocio directamente.',
      whatsappConfig
    );
  }
}

/**
 * Procesa un mensaje de texto
 */
async function processTextMessage(message, user, whatsappConfig) {
  try {
    const text = message.text.body.toLowerCase().trim();
    
    // Comando para consultar puntos
    if (text === 'puntos') {
      await sendPointsInfo(user, whatsappConfig);
      return;
    }
    
    // Comando para ayuda
    if (text === 'ayuda' || text === 'help') {
      await sendHelpInfo(user, whatsappConfig);
      return;
    }
    
    // Respuesta genérica para otros mensajes
    await sendWhatsAppMessage(
      user.phone, 
      'Para registrar un consumo, envía una foto del comprobante de pago. Para consultar tus puntos, envía la palabra "puntos".',
      whatsappConfig
    );
  } catch (error) {
    console.error('Error procesando mensaje de texto:', error);
  }
}

/**
 * Envía información de puntos al usuario
 */
async function sendPointsInfo(user, whatsappConfig) {
  try {
    // Obtener los puntos del cliente en todos los negocios
    const pointsSnapshot = await db.collection('client_points')
      .where('userId', '==', user.id)
      .get();
    
    if (pointsSnapshot.empty) {
      await sendWhatsAppMessage(
        user.phone, 
        'Aún no tienes puntos acumulados en ningún negocio. Envía fotos de tus comprobantes de pago para comenzar a acumular puntos.',
        whatsappConfig
      );
      return;
    }
    
    // Construir mensaje con los puntos en cada negocio
    let message = '🏆 *Tus puntos acumulados:*\n\n';
    
    for (const doc of pointsSnapshot.docs) {
      const pointsData = doc.data();
      const business = await getBusinessInfo(pointsData.businessId);
      
      message += `*${business.name}*: ${pointsData.points} puntos\n`;
    }
    
    message += '\nPara canjear tus puntos, visita el negocio y muestra este mensaje.';
    
    await sendWhatsAppMessage(user.phone, message, whatsappConfig);
  } catch (error) {
    console.error('Error enviando información de puntos:', error);
  }
}

/**
 * Envía información de ayuda al usuario
 */
async function sendHelpInfo(user, whatsappConfig) {
  const helpMessage = `*¡Bienvenido a nuestra Tarjeta de Fidelidad Virtual!*

Aquí tienes algunas instrucciones:

📸 *Envía una foto* del comprobante de pago para registrar tu consumo y acumular puntos.

✍️ Envía estos comandos para:
- *puntos*: Consultar tus puntos acumulados
- *ayuda*: Ver este mensaje de ayuda

¿Tienes dudas? Contacta directamente al negocio para más información.`;

  await sendWhatsAppMessage(user.phone, helpMessage, whatsappConfig);
}

/**
 * Obtiene la URL de un archivo multimedia de WhatsApp
 */
async function getMediaUrl(mediaId, whatsappConfig) {
  try {
    // En un escenario real, aquí haríamos una llamada a la API de WhatsApp
    // para obtener la URL de la imagen
    // Por ahora, retornaremos una URL simulada
    return `https://example.com/media/${mediaId}`;
  } catch (error) {
    console.error('Error obteniendo URL de media:', error);
    throw error;
  }
}

/**
 * Envía un mensaje a través de WhatsApp
 */
async function sendWhatsAppMessage(phone, message, whatsappConfig) {
  try {
    const phoneId = '108512615643697'; // ID del número de teléfono de WhatsApp
    
    // En un escenario real, haríamos una llamada a la API de WhatsApp
    console.log(`Enviando mensaje a ${phone}: ${message}`);
    
    // Ejemplo de cómo sería la llamada real a la API
    /*
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v17.0/${phoneId}/messages`,
      headers: {
        'Authorization': `Bearer ${whatsappConfig.apiToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: {
          body: message
        }
      }
    });
    
    return response.data;
    */
    
    // Por ahora, simulamos una respuesta exitosa
    return { success: true };
  } catch (error) {
    console.error('Error enviando mensaje de WhatsApp:', error);
    throw error;
  }
}

/**
 * Obtiene un negocio aleatorio (para simulación)
 */
async function getRandomBusiness() {
  try {
    const businessesSnapshot = await db.collection('businesses').limit(10).get();
    
    if (businessesSnapshot.empty) {
      throw new Error('No hay negocios disponibles');
    }
    
    const businesses = businessesSnapshot.docs;
    const randomIndex = Math.floor(Math.random() * businesses.length);
    
    return businesses[randomIndex].id;
  } catch (error) {
    console.error('Error obteniendo negocio aleatorio:', error);
    throw error;
  }
}

/**
 * Registra una transacción
 */
async function registerTransaction(userId, businessId, amount, receiptUrl) {
  try {
    const transaction = {
      userId,
      businessId,
      amount,
      receiptUrl,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const transactionRef = await db.collection('transactions').add(transaction);
    
    console.log(`Transacción registrada: ${transactionRef.id}`);
    
    return transactionRef.id;
  } catch (error) {
    console.error('Error registrando transacción:', error);
    throw error;
  }
}

/**
 * Obtiene información de un negocio
 */
async function getBusinessInfo(businessId) {
  try {
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    
    if (!businessDoc.exists) {
      throw new Error(`Negocio no encontrado: ${businessId}`);
    }
    
    return {
      id: businessDoc.id,
      ...businessDoc.data()
    };
  } catch (error) {
    console.error('Error obteniendo información del negocio:', error);
    throw error;
  }
}

/**
 * Actualiza los puntos de un cliente
 */
async function updateClientPoints(userId, businessId, pointsToAdd) {
  try {
    // Buscar si ya existe un registro de puntos para este cliente y negocio
    const pointsSnapshot = await db.collection('client_points')
      .where('userId', '==', userId)
      .where('businessId', '==', businessId)
      .limit(1)
      .get();
    
    if (pointsSnapshot.empty) {
      // Si no existe, crear un nuevo registro
      await db.collection('client_points').add({
        userId,
        businessId,
        points: pointsToAdd,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Si existe, actualizar los puntos
      const pointsDoc = pointsSnapshot.docs[0];
      const currentPoints = pointsDoc.data().points || 0;
      
      await pointsDoc.ref.update({
        points: currentPoints + pointsToAdd,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    console.log(`Puntos actualizados para usuario ${userId} en negocio ${businessId}: +${pointsToAdd}`);
    
    return true;
  } catch (error) {
    console.error('Error actualizando puntos del cliente:', error);
    throw error;
  }
}

/**
 * Obtiene el total de puntos de un cliente en un negocio
 */
async function getTotalPoints(userId, businessId) {
  try {
    const pointsSnapshot = await db.collection('client_points')
      .where('userId', '==', userId)
      .where('businessId', '==', businessId)
      .limit(1)
      .get();
    
    if (pointsSnapshot.empty) {
      return 0;
    }
    
    return pointsSnapshot.docs[0].data().points || 0;
  } catch (error) {
    console.error('Error obteniendo total de puntos:', error);
    return 0;
  }
}
