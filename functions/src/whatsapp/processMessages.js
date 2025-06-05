// functions/src/whatsapp/processMessages.js
const {
  sendWhatsAppMessage,
  downloadWhatsAppMedia,
  getMediaUrl,
} = require("./messaging");
const { processImageWithVision } = require("../services/visionService");
const { extractRUCAndAmount } = require("../utils/textExtraction");
const { normalizePhoneNumber } = require("../utils/phoneUtils");
const firestoreService = require("../services/firestoreService");
const queueService = require("../services/queueService");
const { createImageProcessingTask } = require('../services/cloudTasksService');
const { storeReceiptImage } = require('../services/storageService');
const { businessConfigService } = require("../services/businessConfigService");
const admin = require("firebase-admin");

// Alias para funciones de Firestore para mayor legibilidad
const {
  isDuplicateReceipt,
  findOrCreateCustomer,
  registerPurchase,
  getCustomerPointsInfo,
  findBusinessByRUC,
} = firestoreService;

/**
 * Procesa un mensaje de imagen (comprobante de pago) con sistema configurable
 * @param {object} message - Mensaje de WhatsApp
 * @param {object} user - Información del usuario
 * @param {string} phoneNumberId - ID del número de teléfono de WhatsApp
 * @param {string} apiToken - Token de WhatsApp API
 * @param {object} metadata - Metadatos adicionales
 * @returns {Promise<void>}
 */
async function processImageMessage(
  message,
  user,
  phoneNumberId,
  apiToken,
  metadata = {}
) {
  try {
    console.log("🖼️ Iniciando procesamiento de imagen con sistema configurable");
    const imageId = message.image.id;
    console.log("🆔 ID de imagen:", imageId);
    
    // Validar que tengamos la información del usuario
    if (!user) {
      console.error("❌ Error: Información de usuario no disponible");
      throw new Error("Información de usuario no disponible");
    }
    
    // Obtener el número de teléfono del usuario de múltiples fuentes posibles
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
    } else if (user.wa_id) {
      phoneNumber = user.wa_id;
      console.log(`Teléfono encontrado en user.wa_id: ${phoneNumber}`);
    } else if (typeof user === 'string' && (user.startsWith('+') || /^\d+$/.test(user))) {
      // Si el usuario es directamente una cadena que parece un número de teléfono
      phoneNumber = user;
      console.log(`Usuario es directamente un número de teléfono: ${phoneNumber}`);
    }
    
    // Validar que tengamos un número de teléfono
    if (!phoneNumber) {
      console.error("❌ Error: Número de teléfono del usuario no disponible en ninguna propiedad");
      console.log("Contenido del objeto user:", JSON.stringify(user, null, 2));
      throw new Error("Número de teléfono del usuario no disponible");
    }
    
    // Normalizar el número de teléfono y asegurarnos de que esté disponible en todas las propiedades necesarias
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    user.phone = normalizedPhone;
    user.phoneNumber = normalizedPhone; // Agregar propiedad alternativa
    if (!user.profile) user.profile = {};
    user.profile.phoneNumber = normalizedPhone; // Agregar al perfil también
    console.log(`📱 Número de teléfono normalizado: ${normalizedPhone}`);
    
    // Establecer un tiempo límite para el procesamiento directo
    const processingTimeout = setTimeout(() => {
      throw new Error("Timeout: El procesamiento está tomando demasiado tiempo");
    }, 25000); // 25 segundos, dejando margen para el timeout de la función HTTP (30s)

    try {
      // Descargar la imagen
      console.log("⬇️ Descargando imagen...");
      const imageBuffer = await downloadWhatsAppMedia(imageId, apiToken);

      if (!imageBuffer) {
        throw new Error("No se pudo descargar la imagen");
      }
      console.log(
        "✅ Imagen descargada correctamente, tamaño:",
        imageBuffer.length,
        "bytes"
      );

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
      
      // ========== NUEVA LÓGICA CON SISTEMA CONFIGURABLE ==========
      
      // Paso 1: Extracción inicial para identificar el negocio
      console.log("🔎 Extracción inicial para identificar negocio...");
      const initialExtraction = extractRUCAndAmount(extractedText);
      
      let businessConfig = null;
      let finalExtraction = initialExtraction;
      
      // Paso 2: Si encontramos RUC, buscar negocio y entidad específica
      if (initialExtraction.ruc) {
        console.log("🔍 Buscando negocio y entidad específica por RUC...");
        
        // ACTUALIZADO: findBusinessByRUC ahora retorna negocio + entidad específica
        const businessWithEntity = await findBusinessByRUC(initialExtraction.ruc);
        
        if (businessWithEntity) {
          console.log(`✅ Negocio y entidad encontrados: ${businessWithEntity.slug}/${businessWithEntity.entityId}`);
          console.log(`📋 Entidad: ${businessWithEntity.entity.businessName} - ${businessWithEntity.entity.address}`);
          
          // Obtener configuración específica del negocio
          businessConfig = await businessConfigService.getExtractionConfig(businessWithEntity.slug);
          
          if (businessConfig) {
            console.log(`🎯 Usando configuración específica para: ${businessWithEntity.slug}`);
            
            // Re-extraer con configuración específica
            finalExtraction = extractRUCAndAmount(
              extractedText, 
              businessWithEntity.slug, 
              businessConfig
            );
          } else {
            console.log(`📋 No hay configuración específica para: ${businessWithEntity.slug}, usando patrones base`);
          }
          
          // ACTUALIZADO: Usar datos de la entidad específica
          finalExtraction.businessSlug = businessWithEntity.slug;
          finalExtraction.businessName = businessWithEntity.entity.businessName; // Razón social específica
          finalExtraction.address = businessWithEntity.entity.address; // Dirección específica
          finalExtraction.entityId = businessWithEntity.entityId; // NUEVO
          finalExtraction.entity = businessWithEntity.entity; // NUEVO
        } else {
          console.log("❌ Negocio no registrado con RUC:", initialExtraction.ruc);
          
          // Almacenar imagen para análisis posterior
          try {
            await storeReceiptImage(
              imageBuffer,
              "unregistered_business",
              user.phone,
              `ruc_${initialExtraction.ruc}_${Date.now()}`
            );
          } catch (storageError) {
            console.error("⚠️ Error almacenando imagen de negocio no registrado:", storageError.message);
          }
          
          await sendWhatsAppMessage(
            user.phone,
            `Lo sentimos, el negocio con RUC ${initialExtraction.ruc} no está registrado en nuestro sistema.`,
            phoneNumberId,
            apiToken
          );
          clearTimeout(processingTimeout);
          return;
        }
      } else {
        console.log("⚠️ No se pudo extraer RUC del comprobante");
        
        // Intentar identificar el negocio por nombre usando configuraciones existentes
        const possibleBusiness = await identifyBusinessByText(extractedText);
        
        if (possibleBusiness) {
          console.log(`🎯 Negocio identificado por texto: ${possibleBusiness.slug}`);
          
          businessConfig = await businessConfigService.getExtractionConfig(possibleBusiness.slug);
          
          if (businessConfig) {
            finalExtraction = extractRUCAndAmount(
              extractedText, 
              possibleBusiness.slug, 
              businessConfig
            );
          }
          
          finalExtraction.businessSlug = possibleBusiness.slug;
          finalExtraction.businessName = possibleBusiness.name;
          // NOTA: Sin RUC no podemos determinar la entidad específica
          finalExtraction.entityId = "main"; // Entidad por defecto
        }
      }
      
      // Verificar que tenemos la información mínima necesaria
      if (!finalExtraction.ruc || !finalExtraction.amount || !finalExtraction.invoiceId) {
        console.log("❌ Información insuficiente después de extracción");
        
        // Almacenar imagen para análisis posterior
        try {
          await storeReceiptImage(
            imageBuffer,
            finalExtraction.businessSlug || "insufficient_data",
            user.phone,
            `insufficient_${Date.now()}`
          );
        } catch (storageError) {
          console.error("⚠️ Error almacenando imagen con datos insuficientes:", storageError.message);
        }

        let missingFields = [];
        if (!finalExtraction.ruc) missingFields.push('RUC');
        if (!finalExtraction.amount) missingFields.push('monto');
        if (!finalExtraction.invoiceId) missingFields.push('número de comprobante');

        await sendWhatsAppMessage(
          user.phone,
          `No se pudo identificar ${missingFields.join(', ')} en tu comprobante. Por favor, asegúrate de que la imagen sea legible y que el comprobante sea válido.`,
          phoneNumberId,
          apiToken
        );
        clearTimeout(processingTimeout);
        return;
      }
      
      // NUEVO: Verificar que tenemos la entidad específica
      if (!finalExtraction.entityId || !finalExtraction.entity) {
        console.error("❌ No se pudo determinar la entidad específica");
        await sendWhatsAppMessage(
          user.phone,
          "No se pudo determinar la información específica del local. Por favor, intenta nuevamente.",
          phoneNumberId,
          apiToken
        );
        clearTimeout(processingTimeout);
        return;
      }
      
      // Registro de confianza en la extracción
      console.log(`📊 Extracción completada con confianza: ${finalExtraction.confidence}%`);
      console.log(`🏢 Entidad específica: ${finalExtraction.entity.businessName} (${finalExtraction.entityId})`);
      
      if (finalExtraction.confidence < 50) {
        console.warn(`⚠️ Baja confianza en extracción (${finalExtraction.confidence}%), puede necesitar revisión manual`);
      }
      
      // Almacenar imagen con metadatos de configuración y entidad
      let receiptImageUrl = null;
      try {
        console.log("📸 Almacenando imagen del recibo en Firebase Storage...");
        const storageResult = await storeReceiptImage(
          imageBuffer,
          finalExtraction.businessSlug,
          user.phone,
          `entity_${finalExtraction.entityId}_${businessConfig ? 'custom' : 'base'}_${Date.now()}`
        );
        
        if (storageResult) {
          receiptImageUrl = storageResult.url;
          console.log("✅ Imagen almacenada correctamente:", receiptImageUrl);
        }
      } catch (storageError) {
        console.error("⚠️ Error almacenando imagen:", storageError.message);
      }

      // ACTUALIZADO: Verificar duplicados considerando entidad específica
      console.log("🔄 Verificando si el comprobante es duplicado...");
      const isDuplicate = await isDuplicateReceipt(
        finalExtraction.businessSlug,
        user.phone,
        finalExtraction.amount,
        receiptImageUrl,
        {
          ruc: finalExtraction.ruc,
          invoiceNumber: finalExtraction.invoiceId,
          entityId: finalExtraction.entityId // NUEVO: Considerar entidad específica
        }
      );

      if (isDuplicate) {
        console.log("⚠️ Comprobante duplicado detectado");
        await sendWhatsAppMessage(
          user.phone,
          `Este comprobante (N°: ${finalExtraction.invoiceId}) ya ha sido registrado anteriormente para ${finalExtraction.entity.businessName}.`,
          phoneNumberId,
          apiToken
        );
        clearTimeout(processingTimeout);
        return;
      }

      // ACTUALIZADO: Registrar la compra con datos de entidad específica
      console.log("💾 Registrando compra en Firestore...");
      const result = await registerPurchase(
        finalExtraction.businessSlug,
        user.phone,
        finalExtraction.amount,
        receiptImageUrl,
        {
          ruc: finalExtraction.ruc,
          invoiceNumber: finalExtraction.invoiceId,
          entityId: finalExtraction.entityId, // NUEVO
          entity: finalExtraction.entity, // NUEVO
          businessName: finalExtraction.entity.businessName, // Razón social específica
          address: finalExtraction.entity.address, // Dirección específica
          customerName: user.name || "Cliente",
          verified: true,
          processedFromQueue: false,
          configUsed: businessConfig ? 'custom' : 'base',
          extractionConfidence: finalExtraction.confidence,
          hasStoredImage: !!receiptImageUrl
        }
      );

      console.log("✅ Compra registrada exitosamente:", result);

      // Procesar programas de lealtad
      let loyaltyResults = [];
      try {
        const { processTicketForLoyalty } = require('../services/loyaltyProcessor');
        
        const ticketData = {
          id: result.id || `${finalExtraction.ruc}-${finalExtraction.invoiceNumber}`,
          businessSlug: finalExtraction.businessSlug,
          entityId: finalExtraction.entityId,
          amount: finalExtraction.amount,
          extractedText: finalExtraction.extractedText,
          items: finalExtraction.items || [],
          invoiceNumber: finalExtraction.invoiceNumber,
          ruc: finalExtraction.ruc
        };

        const customerData = {
          phoneNumber: user.phone,
          name: user.name || 'Cliente'
        };

        const businessData = {
          slug: finalExtraction.businessSlug,
          name: finalExtraction.businessName || finalExtraction.businessSlug
        };

        loyaltyResults = await processTicketForLoyalty(ticketData, customerData, businessData);
        console.log("🎁 Programas de lealtad procesados:", loyaltyResults);
      } catch (loyaltyError) {
        console.error("⚠️ Error procesando programas de lealtad:", loyaltyError);
        // No fallar el flujo principal por errores de lealtad
      }

      // ACTUALIZADO: Crear mensaje de confirmación con información específica de la entidad
      const normalizedPhone = normalizePhoneNumber(user.phone);
      
      // Generar mensaje de recompensas de lealtad
      let loyaltyMessage = '';
      if (loyaltyResults && loyaltyResults.length > 0) {
        const eligiblePrograms = loyaltyResults.filter(r => r.eligible && !r.error);
        const redeemablePrograms = eligiblePrograms.filter(r => r.canRedeem);
        
        if (redeemablePrograms.length > 0) {
          loyaltyMessage = '\n\n🎉 ¡RECOMPENSA DISPONIBLE!';
          redeemablePrograms.forEach(program => {
            if (program.type === 'points') {
              loyaltyMessage += `\n⭐ ${program.programName}: Ganaste ${program.pointsEarned} puntos`;
              if (program.availableRewards && program.availableRewards.length > 0) {
                loyaltyMessage += '\n🎁 Puedes canjear:';
                program.availableRewards.forEach(reward => {
                  loyaltyMessage += `\n   • ${reward.reward} (${reward.points} puntos)`;
                });
              }
            } else {
              loyaltyMessage += `\n🎁 ${program.programName}: ¡Compra completada! Puedes canjear tu recompensa`;
            }
          });
        } else if (eligiblePrograms.length > 0) {
          loyaltyMessage = '\n\n🎯 Progreso en programas de lealtad:';
          eligiblePrograms.forEach(program => {
            if (program.type === 'points') {
              loyaltyMessage += `\n⭐ ${program.programName}: +${program.pointsEarned} puntos (Total: ${program.totalPoints})`;
            } else {
              loyaltyMessage += `\n📈 ${program.programName}: ${program.progress}/${program.target}`;
            }
          });
        }
      }
      
      const confirmationMessage = `¡Gracias por tu compra en ${
        finalExtraction.businessName || finalExtraction.businessSlug
      }!

🧯 Comprobante registrado correctamente
💰 Monto: S/ ${finalExtraction.amount}
🏢 Razón Social: ${finalExtraction.entity.businessName}
📍 Dirección: ${
        finalExtraction.entity.address || "No disponible"
      }

🛍️ Compra registrada exitosamente
🛒 Total de compras: ${result.customer?.purchaseCount || 1}${loyaltyMessage}

Ver tu tarjeta de fidelidad: https://asiduo.club/${
        finalExtraction.businessSlug
      }/${normalizedPhone}`;

      // Enviar mensaje de confirmación
      await sendWhatsAppMessage(
        user.phone,
        confirmationMessage,
        phoneNumberId,
        apiToken
      );
      
      // Limpiar el timeout ya que el procesamiento se completó correctamente
      clearTimeout(processingTimeout);
      
    } catch (processingError) {
      // Limpiar el timeout ya que vamos a manejar el error
      clearTimeout(processingTimeout);
      
      // Si ocurre un error durante el procesamiento directo, agregar a la cola
      console.log("⚠️ Error en procesamiento directo, agregando a la cola:", processingError.message);
      
      // Descargar la imagen nuevamente si es necesario
      let imageBuffer;
      try {
        imageBuffer = await downloadWhatsAppMedia(imageId, apiToken);
      } catch (downloadError) {
        console.error("❌ Error descargando imagen para la cola:", downloadError.message);
        throw downloadError;
      }
      
      // Agregar a Cloud Tasks para procesamiento
      // Asegurar que el usuario tenga un número de teléfono normalizado
      const normalizedPhone = normalizePhoneNumber(user.phone);
      
      // Crear una copia del usuario con el teléfono normalizado
      const userForTask = {
        ...user,
        phone: normalizedPhone,
        phoneNumber: normalizedPhone,
        profile: {
          ...(user.profile || {}),
          phoneNumber: normalizedPhone
        }
      };
      
      console.log(`📱 Teléfono normalizado para Cloud Tasks: ${normalizedPhone}`);
      
      // Convertir el buffer a base64 para enviarlo a Cloud Tasks
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      
      const taskData = {
        imageBuffer: base64Image,
        user: userForTask,
        phoneNumberId,
        apiToken,
        imageId,
        metadata: {
          ...metadata,
          addedToTasksAt: new Date().toISOString(),
          originalError: processingError.message,
          phoneNumber: normalizedPhone
        }
      };
      
      // Intentar usar Cloud Tasks primero
      let taskId = null;
      try {
        taskId = await createImageProcessingTask(taskData);
        if (taskId) {
          console.log(`✅ Imagen agregada a Cloud Tasks con ID: ${taskId}`);
        }
      } catch (cloudTasksError) {
        console.error("Error al crear tarea en Cloud Tasks:", cloudTasksError);
      }
      
      // Si Cloud Tasks falló o no está disponible, usar la cola tradicional de Firestore
      if (!taskId) {
        console.log("Cloud Tasks no disponible o falló, usando cola de respaldo de Firestore");
        try {
          const queueId = await queueService.addToQueue({
            ...taskData,
            imageBuffer,
            cloudTasksAttempted: true
          });
          console.log(`✅ Imagen agregada a la cola de respaldo con ID: ${queueId}`);
        } catch (queueError) {
          console.error("Error al agregar a la cola de respaldo:", queueError);
          throw queueError;
        }
      } else {
        // Si Cloud Tasks funcionó, también agregamos a la cola tradicional como respaldo
        try {
          const queueId = await queueService.addToQueue({
            ...taskData,
            imageBuffer,
            taskId,
            isBackup: true
          });
          console.log(`✅ Imagen también agregada a la cola de respaldo con ID: ${queueId}`);
        } catch (queueError) {
          console.error("Error al agregar a la cola de respaldo:", queueError);
        }
      }
      
      // Informar al usuario que el procesamiento continuará en segundo plano
      await sendWhatsAppMessage(
        user.phone,
        "Tu comprobante está siendo procesado en segundo plano debido a su complejidad. Te notificaremos cuando esté listo (esto puede tomar unos minutos).",
        phoneNumberId,
        apiToken
      );
    }
  } catch (error) {
    console.error("❌ Error general procesando imagen:", error.message);
    console.error("Detalles del error:", error.stack);

    // Determinar un mensaje de error más específico basado en el tipo de error
    let errorMessage =
      "Lo sentimos, hubo un error al procesar tu comprobante. Por favor, intenta nuevamente con una imagen más clara.";

    try {
      // Intentar agregar a la cola si es un error general
      if (message && message.image && message.image.id) {
        console.log("⚠️ Intentando agregar a la cola después de error general");
        
        try {
          // Descargar la imagen para la cola
          const imageBuffer = await downloadWhatsAppMedia(message.image.id, apiToken);
          
          if (imageBuffer) {
            // Agregar a la cola de procesamiento
            const queueItemData = {
              imageBuffer,
              user,
              phoneNumberId,
              apiToken,
              imageId: message.image.id,
              metadata: {
                ...metadata,
                addedToQueueAt: new Date().toISOString(),
                originalError: error.message,
                fromGeneralErrorHandler: true
              }
            };
            
            const queueId = await queueService.addToQueue(queueItemData);
            console.log(`✅ Imagen agregada a la cola desde el manejador de errores con ID: ${queueId}`);
            
            errorMessage = "Tu comprobante está siendo procesado en segundo plano. Te notificaremos cuando esté listo (esto puede tomar unos minutos).";
          }
        } catch (queueError) {
          console.error("❌ Error al intentar agregar a la cola:", queueError.message);
        }
      }

      // Enviar mensaje de error al usuario
      await sendWhatsAppMessage(user.phone, errorMessage, phoneNumberId, apiToken).catch(
        (sendError) => {
          console.error("Error enviando mensaje de error:", sendError.message);
        }
      );
    } catch (sendError) {
      console.error("Error enviando mensaje de error:", sendError.message);
    }
  }
}

/**
 * Intenta identificar un negocio por el texto del comprobante cuando no hay RUC
 * @param {string} text - Texto extraído del comprobante
 * @returns {Promise<object|null>} - Datos del negocio identificado o null
 */
async function identifyBusinessByText(text) {
  try {
    console.log("🔍 Intentando identificar negocio por texto...");
    
    // Obtener todas las configuraciones existentes
    const allConfigs = await businessConfigService.getAllExtractionConfigs();
    
    const textLower = text.toLowerCase();
    
    // Buscar coincidencias con aliases de negocios
    for (const [businessSlug, configData] of Object.entries(allConfigs)) {
      const config = configData.config;
      
      if (config.aliases && Array.isArray(config.aliases)) {
        for (const alias of config.aliases) {
          if (textLower.includes(alias.toLowerCase()) || 
              alias.toLowerCase().includes(textLower.split('\n')[0].toLowerCase())) {
            
            console.log(`✅ Negocio identificado por alias: ${businessSlug}`);
            
            // Obtener datos completos del negocio
            const businessDoc = await admin.firestore()
              .collection('businesses')
              .doc(businessSlug)
              .get();
            
            if (businessDoc.exists) {
              return {
                slug: businessSlug,
                ...businessDoc.data()
              };
            }
          }
        }
      }
    }
    
    console.log("⚠️ No se pudo identificar el negocio por texto");
    return null;
  } catch (error) {
    console.error("❌ Error identificando negocio por texto:", error);
    return null;
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
async function processTextMessage(
  message,
  user,
  phoneNumberId,
  apiToken,
  metadata = {}
) {
  try {
    const text = message.text.body.trim().toLowerCase();

    // Comandos disponibles
    if (
      text === "puntos" ||
      text === "points" ||
      text.includes("punto") ||
      text.includes("point")
    ) {
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
      message +=
        "Aún no tienes puntos acumulados en ningún negocio. Envía una foto de tu comprobante de pago para comenzar a acumular puntos.";
    } else {
      message += "*Puntos por negocio:*\n";

      for (const business of pointsInfo.businesses) {
        message += `\n*${business.name}*\n`;
        message += `Puntos: ${business.points}\n`;
        message += `Compras: ${business.purchases}\n`;
        message += `Total gastado: S/ ${business.totalSpent.toFixed(2)}\n`;
        message += `Ver tarjeta: https://asiduo.club/${
          business.slug
        }/${user.phone.replace("+", "")}\n`;
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
  const helpMessage =
    `*Ayuda de Tarjeta de Fidelidad Virtual* 📱\n\n` +
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
  sendHelpInfo,
  identifyBusinessByText,
};