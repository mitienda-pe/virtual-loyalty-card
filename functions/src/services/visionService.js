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
    
    // En Cloud Functions v2, usamos la autenticación por defecto de GCP
    // que ya debería estar disponible en el entorno de ejecución
    console.log('Usando autenticación por defecto de GCP para Vision API');
    
    // Crear el cliente de Vision API con configuración explícita
    visionClient = new ImageAnnotatorClient({
      fallback: 'rest'  // Usar REST en lugar de gRPC para mayor compatibilidad
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
    
    // Crear la solicitud con el formato correcto
    const request = {
      image: {
        content: imageBuffer.toString('base64')
      },
      features: [
        {
          type: 'TEXT_DETECTION'
        }
      ]
    };
    
    console.log("Enviando solicitud a Vision API...");
    
    // Intentar con reintentos en caso de error
    let result;
    let retries = 3;
    let error;
    
    while (retries > 0) {
      try {
        // Usar el método documentTextDetection que es más adecuado para recibos
        // y proporciona un formato de respuesta más estructurado
        [result] = await client.documentTextDetection(imageBuffer);
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
    
    // Extraer el texto completo del documento
    let extractedText = '';
    
    // Verificar si tenemos anotaciones de texto completo
    if (result.fullTextAnnotation) {
      extractedText = result.fullTextAnnotation.text;
    } 
    // Fallback a textAnnotations si fullTextAnnotation no está disponible
    else if (result.textAnnotations && result.textAnnotations.length > 0) {
      extractedText = result.textAnnotations[0].description;
    }
    
    if (!extractedText) {
      console.log("No se detectó texto en la imagen");
      return "";
    }
    
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
