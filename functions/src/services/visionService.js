// functions/src/services/visionService.js
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const admin = require('firebase-admin');

// Configuración para Vision API
let visionClient;

// Función para inicializar el cliente de Vision API
function getVisionClient() {
  if (visionClient) {
    return visionClient;
  }

  try {
    console.log('Inicializando cliente de Vision API...');
    
    // Intentar obtener las credenciales de la configuración de Firebase Functions
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (credentials) {
      console.log('Usando credenciales explícitas de GOOGLE_APPLICATION_CREDENTIALS');
    } else {
      console.log('No se encontraron credenciales en GOOGLE_APPLICATION_CREDENTIALS, intentando usar credenciales de Firebase config');
      
      // Intentar usar las credenciales de Firebase config
      try {
        const functions = require('firebase-functions');
        const googleCredentials = functions.config().google?.credentials;
        
        if (googleCredentials) {
          console.log('Credenciales de Google encontradas en Firebase config');
          
          // Crear un archivo temporal con las credenciales
          const fs = require('fs');
          const os = require('os');
          const path = require('path');
          const credentialsPath = path.join(os.tmpdir(), 'google-credentials.json');
          
          // Convertir el objeto de credenciales a JSON y guardarlo en un archivo temporal
          fs.writeFileSync(credentialsPath, JSON.stringify(googleCredentials));
          
          // Establecer la variable de entorno para que la biblioteca de Vision API use estas credenciales
          process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
          
          console.log(`Credenciales guardadas en ${credentialsPath}`);
        } else {
          console.log('No se encontraron credenciales de Google en Firebase config');
        }
      } catch (configError) {
        console.error('Error obteniendo credenciales de Firebase config:', configError);
      }
    }
    
    // Crear el cliente de Vision API con fallback a REST para evitar problemas con gRPC
    visionClient = new ImageAnnotatorClient({
      fallback: 'rest'
    });
    
    console.log('Cliente de Vision API inicializado correctamente');
    return visionClient;
  } catch (error) {
    console.error('Error inicializando cliente de Vision API:', error);
    throw new Error(`No se pudo inicializar el cliente de Vision API: ${error.message}`);
  }
}

/**
 * Procesa una imagen con Google Vision API para extraer texto
 * @param {Buffer} imageBuffer - Buffer de la imagen a procesar
 * @returns {Promise<string>} - Texto extraído de la imagen
 */
async function processImageWithVision(imageBuffer) {
  try {
    console.log("Iniciando procesamiento de imagen con Vision API");
    
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
      console.error('Error: El parámetro imageBuffer no es un buffer válido');
      throw new Error('El parámetro imageBuffer debe ser un buffer válido');
    }
    
    console.log(`Buffer de imagen recibido: ${imageBuffer.length} bytes`);
    
    // Obtener el cliente de Vision API
    const client = getVisionClient();
    
    console.log("Enviando solicitud a Vision API...");
    
    // Intentar con reintentos en caso de error
    let result;
    let retries = 3;
    let error;
    
    while (retries > 0) {
      try {
        // Realizar el reconocimiento de texto en la imagen
        [result] = await client.textDetection(imageBuffer);
        console.log("Respuesta recibida de Vision API");
        break; // Si llegamos aquí, la llamada fue exitosa
      } catch (err) {
        error = err;
        console.error(`Error en intento ${4 - retries} de Vision API:`, err.message);
        retries--;
        if (retries > 0) {
          console.log(`Reintentando en 1 segundo... ${retries} intentos restantes`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // Si después de todos los intentos seguimos sin resultado, lanzar el último error
    if (!result) {
      throw error || new Error('No se pudo obtener respuesta de Vision API después de múltiples intentos');
    }
    
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      console.log("No se detectó texto en la imagen");
      return "";
    }
    
    // El primer elemento contiene todo el texto detectado
    const extractedText = detections[0].description;
    
    console.log("Texto extraído exitosamente");
    return extractedText;
  } catch (error) {
    console.error("Error procesando imagen con Vision API:", error);
    throw error;
  }
}

module.exports = {
  processImageWithVision
};
