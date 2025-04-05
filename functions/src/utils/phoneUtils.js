// functions/src/utils/phoneUtils.js

/**
 * Normaliza un número de teléfono para asegurar que tenga el formato correcto
 * @param {string} phoneNumber - Número de teléfono a normalizar
 * @returns {string} - Número de teléfono normalizado
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  // Eliminar espacios y caracteres especiales
  let normalized = phoneNumber.replace(/\s+/g, '');
  
  // Asegurarse de que tenga el prefijo +
  if (!normalized.startsWith('+')) {
    // Si empieza con 51 (Perú) pero sin +, añadir el +
    if (normalized.startsWith('51')) {
      normalized = '+' + normalized;
    } 
    // Si es un número peruano sin el prefijo de país, añadir +51
    else if (normalized.startsWith('9')) {
      normalized = '+51' + normalized;
    }
    // Otros casos, simplemente añadir el +
    else {
      normalized = '+' + normalized;
    }
  }
  
  return normalized;
}

module.exports = {
  normalizePhoneNumber
};
