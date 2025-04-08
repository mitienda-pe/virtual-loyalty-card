// functions/src/services/cloudTasksService.js
const {CloudTasksClient} = require('@google-cloud/tasks');
const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Configuración para Cloud Tasks
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'virtual-loyalty-card-e37c9';
const LOCATION = 'us-central1'; // Debe ser la misma región que tus funciones
const QUEUE_NAME = 'image-processing-queue';
const SERVICE_ACCOUNT_EMAIL = `${PROJECT_ID}@appspot.gserviceaccount.com`;

// Cliente de Cloud Tasks - inicializado bajo demanda para evitar errores en desarrollo local
let tasksClient = null;

/**
 * Obtiene o crea el cliente de Cloud Tasks
 * @returns {CloudTasksClient}
 */
function getTasksClient() {
  if (!tasksClient) {
    try {
      tasksClient = new CloudTasksClient();
    } catch (error) {
      console.error('Error al crear el cliente de Cloud Tasks:', error);
      throw error;
    }
  }
  return tasksClient;
}

/**
 * Asegura que la cola exista, creándola si es necesario
 * @returns {Promise<string>} - Nombre completo de la cola
 */
async function ensureQueueExists() {
  try {
    const client = getTasksClient();
    const parent = client.locationPath(PROJECT_ID, LOCATION);
    const queuePath = client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
    
    try {
      // Intentar obtener la cola existente
      const [existingQueue] = await client.getQueue({ name: queuePath });
      console.log(`Cola existente encontrada: ${existingQueue.name}`);
      return existingQueue.name;
    } catch (error) {
      // Si la cola no existe, crearla
      if (error.code === 5) { // NOT_FOUND
        console.log(`Creando cola de Cloud Tasks: ${QUEUE_NAME}`);
        
        // Configuración de la cola
        const queue = {
          name: queuePath,
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
        return response.name;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error al asegurar que la cola exista:', error);
    throw error;
  }
}

/**
 * Crea una tarea para procesar una imagen
 * @param {object} data - Datos para procesar (imagen, usuario, etc.)
 * @param {number} delayInSeconds - Retraso en segundos (opcional)
 * @returns {Promise<string>} - ID de la tarea creada o null si hay error
 */
async function createImageProcessingTask(data, delayInSeconds = 0) {
  try {
    console.log('🔄 Creando tarea para procesar imagen con Cloud Tasks');
    
    // Asegurar que la cola exista
    const queueName = await ensureQueueExists();
    
    // Obtener el cliente
    const client = getTasksClient();
    
    // URL del endpoint que procesará la tarea (funciones v2 tienen un formato de URL diferente)
    const url = `https://processImageTask-${PROJECT_ID}.${LOCATION}.cloudfunctions.net`;
    
    // Crear la tarea
    const task = {
      httpRequest: {
        httpMethod: 'POST',
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify(data)).toString('base64'),
        oidcToken: {
          serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
          audience: url,
        },
      },
    };
    
    // Configurar tiempo de ejecución si hay retraso
    if (delayInSeconds > 0) {
      task.scheduleTime = {
        seconds: parseInt(Date.now() / 1000) + delayInSeconds,
      };
    }
    
    // Crear la tarea en Cloud Tasks
    const [response] = await client.createTask({parent: queueName, task});
    const taskId = response.name.split('/').pop();
    console.log(`✅ Tarea creada con ID: ${taskId}`);
    
    // Guardar referencia en Firestore para seguimiento
    try {
      await admin.firestore().collection('tasks_tracking').doc(taskId).set({
        taskId,
        status: 'PENDING',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Guardar datos relevantes pero no el buffer completo para evitar problemas
        metadata: {
          phoneNumber: data.user?.phone || data.user?.phoneNumber,
          imageId: data.imageId,
          addedAt: new Date().toISOString()
        }
      });
    } catch (firestoreError) {
      console.error('Error al guardar referencia en Firestore:', firestoreError);
      // No lanzamos el error para no interrumpir el flujo principal
    }
    
    return taskId;
  } catch (error) {
    console.error('❌ Error al crear tarea en Cloud Tasks:', error);
    
    // Si estamos en un entorno de desarrollo o hay un error de permisos,
    // devolvemos null en lugar de lanzar el error para permitir el flujo alternativo
    if (process.env.NODE_ENV === 'development' || 
        error.message.includes('permission') || 
        error.message.includes('credentials')) {
      console.log('Continuando con flujo alternativo debido a error de Cloud Tasks');
      return null;
    }
    
    throw error;
  }
}

/**
 * Actualiza el estado de una tarea en el seguimiento de Firestore
 * @param {string} taskId - ID de la tarea
 * @param {string} status - Nuevo estado (PROCESSING, COMPLETED, FAILED)
 * @param {object} result - Resultado o error (opcional)
 * @returns {Promise<void>}
 */
async function updateTaskStatus(taskId, status, result = null) {
  try {
    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    if (result) {
      updateData.result = result;
    }
    
    await admin.firestore().collection('tasks_tracking').doc(taskId).update(updateData);
    console.log(`✅ Estado de tarea ${taskId} actualizado a: ${status}`);
  } catch (error) {
    console.error(`❌ Error al actualizar estado de tarea ${taskId}:`, error);
    throw error;
  }
}

module.exports = {
  createImageProcessingTask,
  updateTaskStatus,
  ensureQueueExists,
  getTasksClient,
  QUEUE_NAME,
  PROJECT_ID,
  LOCATION
};
