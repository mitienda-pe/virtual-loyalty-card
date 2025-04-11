// functions/src/services/storageService.js
const admin = require('firebase-admin');
const path = require('path');

/**
 * Almacena una imagen de recibo en Firebase Storage
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {string} businessSlug - Slug del negocio
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {string} [receiptId] - ID opcional del recibo
 * @returns {Promise<{path: string, url: string}>} - Ruta y URL de la imagen almacenada
 */
async function storeReceiptImage(imageBuffer, businessSlug, phoneNumber, receiptId = null) {
  try {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
      console.error('Error: El parámetro imageBuffer no es un buffer válido');
      throw new Error('El parámetro imageBuffer debe ser un buffer válido');
    }

    if (!businessSlug) {
      console.error('Error: businessSlug es requerido');
      throw new Error('businessSlug es requerido para almacenar la imagen');
    }

    if (!phoneNumber) {
      console.error('Error: phoneNumber es requerido');
      throw new Error('phoneNumber es requerido para almacenar la imagen');
    }

    // Generar un ID único si no se proporciona uno
    const timestamp = Date.now();
    const uniqueId = receiptId || `receipt_${timestamp}`;
    
    // Construir la ruta de almacenamiento
    const storagePath = `receipts/${businessSlug}/${phoneNumber}/${timestamp}_${uniqueId}.jpg`;
    
    console.log(`📁 Almacenando imagen en: ${storagePath}`);
    
    // Referencia al archivo en Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    
    // Guardar el archivo
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          phoneNumber: phoneNumber,
          businessSlug: businessSlug,
          timestamp: timestamp.toString(),
          receiptId: uniqueId
        }
      }
    });
    
    // Obtener la URL firmada para acceso público
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Fecha lejana para URL "permanente"
    });
    
    console.log(`✅ Imagen almacenada exitosamente en: ${storagePath}`);
    console.log(`🔗 URL de acceso: ${url}`);
    
    return {
      path: storagePath,
      url: url
    };
  } catch (error) {
    console.error('❌ Error almacenando imagen:', error);
    // No lanzamos el error para que no interrumpa el flujo principal
    // Solo registramos el error y retornamos null
    return null;
  }
}

/**
 * Elimina imágenes antiguas basadas en una política de retención
 * @param {number} retentionDays - Días de retención (por defecto 90 días)
 * @returns {Promise<number>} - Número de archivos eliminados
 */
async function cleanupOldImages(retentionDays = 90) {
  try {
    console.log(`🧹 Iniciando limpieza de imágenes antiguas (retención: ${retentionDays} días)...`);
    
    // Calcular la fecha límite
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffTimestamp = cutoffDate.getTime();
    
    // Obtener todos los archivos en la carpeta receipts
    const [files] = await admin.storage().bucket().getFiles({
      prefix: 'receipts/'
    });
    
    console.log(`📊 Total de archivos encontrados: ${files.length}`);
    
    let deletedCount = 0;
    
    // Filtrar y eliminar archivos antiguos
    for (const file of files) {
      try {
        const [metadata] = await file.getMetadata();
        const createdTime = new Date(metadata.timeCreated).getTime();
        
        // Si el archivo es más antiguo que el período de retención, eliminarlo
        if (createdTime < cutoffTimestamp) {
          await file.delete();
          deletedCount++;
          console.log(`🗑️ Archivo eliminado: ${file.name}`);
        }
      } catch (fileError) {
        console.error(`Error procesando archivo ${file.name}:`, fileError);
        // Continuar con el siguiente archivo
      }
    }
    
    console.log(`✅ Limpieza completada. ${deletedCount} archivos eliminados.`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error en la limpieza de imágenes:', error);
    throw error;
  }
}

module.exports = {
  storeReceiptImage,
  cleanupOldImages
};
