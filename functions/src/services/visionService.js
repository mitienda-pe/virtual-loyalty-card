// functions/src/services/visionService.js
const { ImageAnnotatorClient } = require('@google-cloud/vision');

// Inicializar Vision API client
const visionClient = new ImageAnnotatorClient();

/**
 * Procesa una imagen con Google Vision API para extraer texto
 * @param {Buffer} imageBuffer - Buffer de la imagen a procesar
 * @returns {Promise<string>} - Texto extraído de la imagen
 */
async function processImageWithVision(imageBuffer) {
  try {
    console.log("Iniciando procesamiento de imagen con Vision API");
    
    // Realizar el reconocimiento de texto en la imagen
    const [result] = await visionClient.textDetection(imageBuffer);
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
