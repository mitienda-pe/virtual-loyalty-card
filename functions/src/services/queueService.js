// functions/src/services/queueService.js
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Colección para la cola de procesamiento de imágenes
 */
const QUEUE_COLLECTION = 'processing_queue';

/**
 * Estados posibles para los elementos en la cola
 */
const QUEUE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Agrega un elemento a la cola de procesamiento
 * @param {object} data - Datos a procesar
 * @returns {Promise<string>} - ID del elemento en la cola
 */
async function addToQueue(data) {
  try {
    console.log('📋 Agregando elemento a la cola de procesamiento');
    
    // Crear objeto con los datos necesarios para el procesamiento
    const queueItem = {
      data: data,
      status: QUEUE_STATUS.PENDING,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: 0,
      error: null
    };
    
    // Guardar en Firestore
    const docRef = await db.collection(QUEUE_COLLECTION).add(queueItem);
    console.log(`✅ Elemento agregado a la cola con ID: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error al agregar elemento a la cola:', error);
    throw error;
  }
}

/**
 * Actualiza el estado de un elemento en la cola
 * @param {string} queueId - ID del elemento en la cola
 * @param {string} status - Nuevo estado
 * @param {object} additionalData - Datos adicionales para actualizar
 * @returns {Promise<void>}
 */
async function updateQueueItemStatus(queueId, status, additionalData = {}) {
  try {
    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...additionalData
    };
    
    await db.collection(QUEUE_COLLECTION).doc(queueId).update(updateData);
    console.log(`📝 Estado del elemento ${queueId} actualizado a: ${status}`);
  } catch (error) {
    console.error(`❌ Error al actualizar estado del elemento ${queueId}:`, error);
    throw error;
  }
}

/**
 * Marca un elemento como en procesamiento
 * @param {string} queueId - ID del elemento en la cola
 * @returns {Promise<void>}
 */
async function markAsProcessing(queueId) {
  await updateQueueItemStatus(queueId, QUEUE_STATUS.PROCESSING, {
    processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
    attempts: admin.firestore.FieldValue.increment(1)
  });
}

/**
 * Marca un elemento como completado
 * @param {string} queueId - ID del elemento en la cola
 * @param {object} result - Resultado del procesamiento
 * @returns {Promise<void>}
 */
async function markAsCompleted(queueId, result = {}) {
  await updateQueueItemStatus(queueId, QUEUE_STATUS.COMPLETED, {
    result,
    completedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Marca un elemento como fallido
 * @param {string} queueId - ID del elemento en la cola
 * @param {Error} error - Error ocurrido
 * @returns {Promise<void>}
 */
async function markAsFailed(queueId, error) {
  await updateQueueItemStatus(queueId, QUEUE_STATUS.FAILED, {
    error: error.message,
    errorStack: error.stack
  });
}

/**
 * Obtiene elementos pendientes de la cola
 * @param {number} limit - Límite de elementos a obtener
 * @returns {Promise<Array>} - Elementos pendientes
 */
async function getPendingItems(limit = 10) {
  try {
    const snapshot = await db.collection(QUEUE_COLLECTION)
      .where('status', '==', QUEUE_STATUS.PENDING)
      .orderBy('createdAt')
      .limit(limit)
      .get();
    
    const items = [];
    snapshot.forEach(doc => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return items;
  } catch (error) {
    console.error('❌ Error al obtener elementos pendientes:', error);
    throw error;
  }
}

module.exports = {
  addToQueue,
  updateQueueItemStatus,
  markAsProcessing,
  markAsCompleted,
  markAsFailed,
  getPendingItems,
  QUEUE_STATUS
};
