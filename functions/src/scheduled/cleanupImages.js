// functions/src/scheduled/cleanupImages.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { cleanupOldImages } = require("../services/storageService");

/**
 * Función programada que se ejecuta una vez al día para limpiar imágenes antiguas
 * según la política de retención definida (90 días por defecto)
 */
const cleanupImagesScheduled = onSchedule({
  schedule: "every day 03:00", // Se ejecuta a las 3 AM todos los días
  timeZone: "America/Lima", // Zona horaria de Perú
  retryCount: 3, // Reintentar hasta 3 veces en caso de error
  // Especificar Node.js 22 como runtime
  runtime: "nodejs22",
  memory: "512MiB",
}, async (event) => {
  console.log("🧹 Iniciando limpieza programada de imágenes antiguas...");
  
  try {
    // Definir el período de retención en días (90 días por defecto)
    const retentionDays = 90;
    
    // Ejecutar la limpieza
    const deletedCount = await cleanupOldImages(retentionDays);
    
    console.log(`✅ Limpieza completada. Se eliminaron ${deletedCount} imágenes antiguas.`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error("❌ Error en la limpieza programada de imágenes:", error);
    return { success: false, error: error.message };
  }
});

module.exports = {
  cleanupImagesScheduled
};
