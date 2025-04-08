// functions/src/config/createTaskQueue.js
const {CloudTasksClient} = require('@google-cloud/tasks');

// Configuración para Cloud Tasks
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'virtual-loyalty-card-e37c9';
const LOCATION = 'us-central1'; // Debe ser la misma región que tus funciones
const QUEUE_NAME = 'image-processing-queue';

/**
 * Script para crear la cola de Cloud Tasks
 * Ejecutar este script una vez para configurar la cola
 */
async function createTaskQueue() {
  try {
    const client = new CloudTasksClient();
    const parent = client.locationPath(PROJECT_ID, LOCATION);
    
    console.log(`Creando cola de Cloud Tasks: ${QUEUE_NAME}`);
    
    // Configuración de la cola
    const queue = {
      name: client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME),
      rateLimits: {
        maxDispatchesPerSecond: 5,
        maxBurstSize: 10,
        maxConcurrentDispatches: 5
      },
      retryConfig: {
        maxAttempts: 5,
        minBackoff: {seconds: 60}, // 1 minuto
        maxBackoff: {seconds: 3600}, // 1 hora
        maxDoublings: 3
      }
    };
    
    // Crear la cola
    const [response] = await client.createQueue({
      parent,
      queue
    });
    
    console.log(`Cola creada: ${response.name}`);
    return response;
  } catch (error) {
    // Si la cola ya existe, mostrar un mensaje informativo
    if (error.code === 6) { // ALREADY_EXISTS
      console.log(`La cola ${QUEUE_NAME} ya existe en ${LOCATION}`);
      return null;
    }
    console.error('Error al crear la cola:', error);
    throw error;
  }
}

// Si este archivo se ejecuta directamente
if (require.main === module) {
  createTaskQueue()
    .then(() => console.log('Proceso completado'))
    .catch(err => console.error('Error:', err));
}

module.exports = {
  createTaskQueue,
  QUEUE_NAME,
  PROJECT_ID,
  LOCATION
};
