// functions/src/whatsapp/processImageTask.js
const functions = require('firebase-functions');
const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { processImageWithVision } = require('../services/visionService');
const { sendWhatsAppMessage } = require('./messaging');
const { normalizePhoneNumber } = require('../utils/phoneUtils');
const { extractRUCAndAmount } = require('../utils/textExtraction');
const { registerPurchase, findBusinessByRUC, getCustomerBusinesses } = require('../services/firestoreService');
const { updateTaskStatus } = require('../services/cloudTasksService');

// Configuración para WhatsApp
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

/**
 * Función Cloud para procesar imágenes desde Cloud Tasks
 * Esta función es llamada por Cloud Tasks y procesa una imagen de recibo
 */
exports.processImageTask = onRequest(
  {
    timeoutSeconds: 540, // 9 minutos (máximo permitido)
    memory: '2GB',
    minInstances: 0,
    maxInstances: 10,
    // Especificar el runtime de Node.js 22
    region: 'us-central1'
  },
  async (req, res) => {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      console.log('🔄 Procesando tarea de imagen recibida desde Cloud Tasks');
      
      // Obtener datos de la tarea
      const taskData = req.body;
      const { imageBuffer, user, phoneNumberId, apiToken, taskId } = taskData;
      
      // Validar datos de entrada
      if (!imageBuffer || !user) {
        console.error('Error: Datos de imagen o usuario no disponibles');
        res.status(400).send('Bad Request: Missing required data');
        return;
      }
      
      // Convertir el buffer de imagen de base64 a Buffer si es necesario
      let processableBuffer;
      if (typeof imageBuffer === 'string') {
        processableBuffer = Buffer.from(imageBuffer, 'base64');
      } else if (Array.isArray(imageBuffer)) {
        processableBuffer = Buffer.from(imageBuffer);
      } else {
        processableBuffer = imageBuffer;
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
        console.error('Error: Número de teléfono no disponible en ninguna propiedad');
        res.status(400).send('Bad Request: Phone number not available');
        return;
      }
      
      // Normalizar el número de teléfono y asegurarnos de que esté disponible en todas las propiedades necesarias
      const userPhoneNormalized = normalizePhoneNumber(phoneNumber);
      user.phone = userPhoneNormalized;
      user.phoneNumber = userPhoneNormalized;
      if (!user.profile) user.profile = {};
      user.profile.phoneNumber = userPhoneNormalized;
      console.log(`Teléfono normalizado: ${userPhoneNormalized}`);
      
      // Actualizar estado de la tarea a "procesando"
      if (taskId) {
        await updateTaskStatus(taskId, 'PROCESSING');
      }
      
      // Procesar la imagen con Google Vision
      console.log("🔍 Procesando imagen con Vision API...");
      const extractedText = await processImageWithVision(processableBuffer);
      
      if (!extractedText) {
        console.error("No se pudo extraer texto de la imagen (texto vacío)");
        throw new Error('No se pudo extraer texto de la imagen');
      }
      
      console.log(`Texto extraído: ${extractedText.substring(0, 100)}...`);
      
      // Extraer datos del recibo
      console.log("🧾 Extrayendo datos del recibo...");
      const receiptData = extractRUCAndAmount(extractedText);
      
      if (!receiptData || !receiptData.ruc) {
        console.error("No se pudo identificar un RUC válido en el recibo");
        throw new Error('No se pudo identificar un RUC válido en el recibo');
      }
      
      console.log(`Datos extraídos: RUC=${receiptData.ruc}, Monto=${receiptData.amount}`);
      
      // Registrar la compra en la base de datos
      console.log("💾 Registrando compra en la base de datos...");
      
      // Buscar el negocio usando el RUC
      const business = await findBusinessByRUC(receiptData.ruc);
      const businessSlug = business?.businessSlug || receiptData.businessSlug;
      
      if (!businessSlug) {
        console.error(`No se encontró un negocio registrado con el RUC: ${receiptData.ruc}`);
        throw new Error(`No se encontró un negocio registrado con el RUC: ${receiptData.ruc}`);
      }
      
      console.log(`Intentando registrar compra con: businessSlug=${businessSlug}, phone=${user.phone}, amount=${receiptData.amount}`);
      console.log(`Datos adicionales: RUC=${receiptData.ruc}, invoiceNumber=${receiptData.invoiceId}, businessName=${receiptData.businessName}`);
      
      let purchaseResult;
      
      try {
        // Normalizar el número de teléfono para asegurar consistencia
        const normalizedPhone = user.phone.startsWith('+') ? user.phone : `+${user.phone}`;
        console.log(`Número de teléfono normalizado para registro: ${normalizedPhone}`);
        
        purchaseResult = await registerPurchase(
          businessSlug,
          normalizedPhone, // Usar el número normalizado
          receiptData.amount,
          null, // URL de imagen (se actualizará después)
          {
            ruc: receiptData.ruc,
            invoiceNumber: receiptData.invoiceId,
            businessName: receiptData.businessName,
            address: receiptData.address,
            customerName: user.name || (user.profile && user.profile.name) || user.displayName || user.fullName || user.given_name || user.phone || "—",
            verified: true,
            processedFromCloudTasks: true,
            taskId: taskId || req.body.taskId
          }
        );
        
        if (!purchaseResult || !purchaseResult.success) {
          throw new Error(`Fallo al registrar compra: ${purchaseResult ? purchaseResult.error : 'Resultado nulo'}`);
        }
        
        console.log(`✅ Compra registrada exitosamente: ${JSON.stringify(purchaseResult)}`);
      } catch (registerError) {
        console.error(`❌ Error registrando compra: ${registerError.message}`);
        console.error(registerError.stack);
        
        // Enviar mensaje de error al usuario
        await sendWhatsAppMessage(
          user.phone,
          `Hubo un problema al registrar tu compra: ${registerError.message}. Por favor, intenta nuevamente.`,
          phoneNumberId,
          apiToken
        );
        
        throw registerError;
      }
      
      // Verificar que la compra se haya registrado correctamente antes de enviar confirmación
      console.log("Verificando registro de compra en Firestore...");
      
      // Obtener información del cliente desde la nueva estructura
      const customerBusinesses = await getCustomerBusinesses(userPhoneNormalized);
      const customerInfo = customerBusinesses.find(b => b.businessSlug === businessSlug);
      
      if (!customerInfo || !customerInfo.purchaseCount) {
        console.error("No se encontró información del cliente después de registrar la compra");
        throw new Error("La compra no se registró correctamente en Firestore");
      }
      
      console.log(`Cliente verificado: ${JSON.stringify(customerInfo)}`);
      
      // Enviar mensaje de confirmación al usuario
      console.log("📱 Enviando confirmación por WhatsApp...");
      let confirmationMessage = `¡Gracias por tu compra en ${business?.name || receiptData.businessName || 'el comercio'}!\n\n`;
      confirmationMessage += `🧯 Comprobante registrado correctamente\n`;
      confirmationMessage += `💰 Monto: S/ ${receiptData.amount}\n`;
      if (receiptData.address) {
        confirmationMessage += `📍 Dirección: ${receiptData.address}\n`;
      }
      confirmationMessage += "\n";
      
      // Agregar información de compras
      confirmationMessage += `🛍️ Compra registrada exitosamente\n`;
      confirmationMessage += `🛒 Total de compras: ${customerInfo.purchaseCount}\n\n`;
      
      // Agregar mensaje de premio escalonado si corresponde
      if (purchaseResult.reward) {
        confirmationMessage += `🎁 ¡Felicidades! Has alcanzado un premio: ${purchaseResult.reward}\n`;
      }
      
      // Agregar enlace a la tarjeta de fidelidad
      confirmationMessage += `Ver tu tarjeta de fidelidad: https://asiduo.club/${businessSlug}/${userPhoneNormalized}`;
      
      await sendWhatsAppMessage(
        userPhoneNormalized,
        confirmationMessage,
        phoneNumberId || WHATSAPP_PHONE_NUMBER_ID,
        apiToken || WHATSAPP_API_TOKEN
      );
      
      // Actualizar estado de la tarea a "completado"
      if (taskId) {
        await updateTaskStatus(taskId, 'COMPLETED', purchaseResult);
      }
      
      console.log("✅ Procesamiento de imagen completado con éxito");
      res.status(200).send({
        success: true,
        message: 'Imagen procesada correctamente',
        result: purchaseResult
      });
      
    } catch (error) {
      console.error("❌ Error al procesar imagen:", error);
      
      // Intentar notificar al usuario sobre el error
      try {
        const { user, phoneNumberId, apiToken } = req.body;
        
        // Intentar obtener el número de teléfono de varias fuentes posibles
        let phoneNumber = null;
        
        if (user && user.phone) {
          phoneNumber = user.phone;
        } else if (user && user.phoneNumber) {
          phoneNumber = user.phoneNumber;
        } else if (user && user.profile && user.profile.phoneNumber) {
          phoneNumber = user.profile.phoneNumber;
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
      
      // Actualizar estado de la tarea a "fallido"
      if (req.body && req.body.taskId) {
        await updateTaskStatus(req.body.taskId, 'FAILED', {
          error: error.message,
          stack: error.stack
        });
      }
      
      res.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
