// functions/src/utils/textExtraction.js

/**
 * Extrae información detallada del texto del comprobante
 * @param {string} text - Texto extraído del comprobante
 * @returns {object} - Información extraída del comprobante
 */
function extractRUCAndAmount(text) {
  // Patrones comunes para RUC en facturas peruanas
  const rucPatterns = [
    /R\.U\.C\.\s*:?\s*([0-9]{11})/i, 
    /RUC\s*:?\s*([0-9]{11})/i,
    /R\.U\.C\.?\s*([0-9]{11})/i
  ];

  // Patrones para montos totales - ordenados por prioridad (los más específicos primero)
  const amountPatterns = [
    // Patrones específicos para "Importe Total S/XX.XX" (más prioritario)
    /Importe\s+Total\s+S\/\s*:?\s*([0-9]+[.,][0-9]{2})/i,
    
    // Patrones para "Total a Pagar S/XX.XX"
    /Total\s+a\s+Pagar\s+S\/\s*:?\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s+A\s+PAGAR\s*:?\s*S\/\.?\s*([0-9]+[.,][0-9]{2})/i,
    
    // Otros patrones generales para totales
    /TOTAL\s+SOLES\s+S\/\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s+DEL\s+TICKET\s*:?\s*S\/\.?\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s+VENTA\s*:?\s*S\/\.?\s*([0-9]+[.,][0-9]{2})/i,
    /IMPORTE\s+TOTAL\s*:?\s*S\/\.?\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s*:?\s*S\/\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s*:?\s*S\/\.?\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s*:?\s*([0-9]+[.,][0-9]{2})/i,
    /IMPORTE\s*:?\s*S\/\.?\s*([0-9]+[.,][0-9]{2})/i,
    /S\/\s*([0-9]+[.,][0-9]{2})\s*(SOLES|PEN|S\.|$)/i,
    /SON\s*:?\s*(.+?)\s+CON\s+([0-9]{2})\/100\s+SOLES/i, // Patrón para "SON: OCHENTA Y CUATRO CON 00/100 SOLES"
  ];
  
  // Patrones para número de factura/boleta
  const invoiceNumberPatterns = [
    /BOLETA DE VENTA ELECTRONICA\s*:?\s*([A-Z0-9\-]+)/i,
    /BOLETA ELECTRONICA\s*:?\s*([A-Z0-9\-]+)/i,
    /BOLETA DE VENTA\s*:?\s*([A-Z0-9\-]+)/i,
    /BOLETA\s*:?\s*([A-Z0-9\-]+)/i,
    /FACTURA ELECTRONICA\s*:?\s*([A-Z0-9\-]+)/i,
    /FACTURA\s*:?\s*([A-Z0-9\-]+)/i,
    /TICKET\s*:?\s*([A-Z0-9\-]+)/i,
    /DOCUMENTO\s*:?\s*([A-Z0-9\-]+)/i,
    /N°\s*:?\s*([A-Z0-9\-]+)/i,
    /NRO\.?\s*:?\s*([A-Z0-9\-]+)/i,
    /B([0-9]{3})\-([0-9]{6,})/i,  // Formato B001-000001
    /F([0-9]{3})\-([0-9]{6,})/i,  // Formato F001-000001
  ];

  // Patrones para razón social
  const businessNamePatterns = [
    /RAZON SOCIAL\s*:?\s*(.+?)(?=\n|$)/i,
    /NOMBRE COMERCIAL\s*:?\s*(.+?)(?=\n|$)/i,
    /DENOMINACION\s*:?\s*(.+?)(?=\n|$)/i
  ];

  // Patrones para dirección
  const addressPatterns = [
    /DIRECCION\s*:?\s*(.+?)(?=\n|$)/i,
    /DOMICILIO FISCAL\s*:?\s*(.+?)(?=\n|$)/i,
    /DIR\s*:?\s*(.+?)(?=\n|$)/i,
    /AV\.?\s+([^\n]+?)(?=\n|$)/i,
    /JR\.?\s+([^\n]+?)(?=\n|$)/i,
    /CALLE\s+([^\n]+?)(?=\n|$)/i,
    /URB\.?\s+([^\n]+?)(?=\n|$)/i,
    /SAN ISIDRO[^\n]*LIMA[^\n]*LIMA/i,  // Patrón específico para La Baguette
  ];

  // Patrones para vendedor/mesero
  const vendorPatterns = [
    /MOZO\s*:?\s*(.+?)(?=\n|$)/i,
    /VENDEDOR\s*:?\s*(.+?)(?=\n|$)/i,
    /CAJERO\s*:?\s*(.+?)(?=\n|$)/i,
    /ATENDIDO POR\s*:?\s*(.+?)(?=\n|$)/i,
    /ASESOR\s*:?\s*(.+?)(?=\n|$)/i,
  ];

  // Patrones para fecha de emisión
  const datePatterns = [
    /FECHA DE EMISION\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    /FECHA\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    /EMISION\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    /EMITIDO\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    /FECHA\s*:?\s*([0-9]{1,2}\-[0-9]{1,2}\-[0-9]{2,4})/i,
    /FECHA DE EMISION\s*:?\s*([0-9]{2}\s+[A-Za-z]+\s+[0-9]{4})/i, // Formato: 04 Abril 2025
    /FECHA\s*:?\s*([0-9]{2}\s+[A-Za-z]+\s+[0-9]{4})/i, // Formato: 04 Abril 2025
    /([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,  // Fecha en formato dd/mm/yyyy o d/m/yyyy
    /([0-9]{1,2}\-[0-9]{1,2}\-[0-9]{2,4})/i,  // Fecha en formato dd-mm-yyyy o d-m-yyyy
  ];

  // Variables para almacenar la información extraída
  let ruc = null;
  let amount = null;
  let amountInWords = null; // Monto en letras
  let businessName = null;
  let businessSlug = "default";
  let address = null;
  let vendor = null;
  let items = [];
  let location = null;
  let purchaseDate = null;
  let invoiceNumber = null;

  // Buscar RUC
  for (const pattern of rucPatterns) {
    const match = text.match(pattern);
    if (match) {
      ruc = match[1];
      break;
    }
  }

  // Buscar razón social con patrones específicos
  for (const pattern of businessNamePatterns) {
    const match = text.match(pattern);
    if (match) {
      businessName = match[1].trim();
      break;
    }
  }

  // Si no se encontró con patrones, intentar extraer razón social de las primeras líneas
  if (!businessName) {
    const lines = text.split('\n');
    if (lines.length > 0) {
      // La razón social suele estar en las primeras líneas, antes del RUC
      const firstLine = lines[0].trim();
      if (firstLine && firstLine.length > 3 && !/^(RUC|FACTURA|BOLETA|TICKET)/i.test(firstLine)) {
        businessName = firstLine;
      } else if (lines.length > 1) {
        // Intentar con la segunda línea si la primera no parece válida
        const secondLine = lines[1].trim();
        if (secondLine && secondLine.length > 3 && !/^(RUC|FACTURA|BOLETA|TICKET)/i.test(secondLine)) {
          businessName = secondLine;
        }
      }
    }
  }

  // Buscar monto total
  // Primero intentamos con "Importe Total" que suele ser el monto final después de impuestos
  let importeTotalPattern = /Importe\s+Total\s+S\/\s*:?\s*([0-9]+[.,][0-9]{2})/i;
  let importeTotalResult = text.match(importeTotalPattern);
  if (importeTotalResult && importeTotalResult[1]) {
    const cleanAmount = importeTotalResult[1].replace(",", ".");
    amount = parseFloat(cleanAmount);
    if (!isNaN(amount) && amount > 0) {
      console.log(`Monto detectado de Importe Total: ${amount}`);
    }
  }
  
  // Si no encontramos "Importe Total", buscamos "Total a Pagar"
  if (!amount || isNaN(amount) || amount <= 0) {
    const totalPagarMatch = text.match(/Total\s+a\s+Pagar\s+S\/\s*:?\s*([0-9]+[.,][0-9]{2})/i);
    if (totalPagarMatch && totalPagarMatch[1]) {
      const cleanAmount = totalPagarMatch[1].replace(",", ".");
      amount = parseFloat(cleanAmount);
      if (!isNaN(amount) && amount > 0) {
        console.log(`Monto detectado de Total a Pagar: ${amount}`);
      }
    }
  }
  
  // Buscar el monto en letras ("SON: VEINTE Y SIETE Y 00/100 Soles")
  const amountInWordsMatch = text.match(/SON\s*:?\s*(.+?)\s+[YC]\s+([0-9]{2})\/100\s+SOLES/i);
  if (amountInWordsMatch) {
    amountInWords = amountInWordsMatch[0].trim();
    console.log(`Monto en letras encontrado: ${amountInWords}`);
    
    // Extraer el monto en letras para verificación
    const amountWords = amountInWordsMatch[1].trim();
    const amountCents = amountInWordsMatch[2];
    
    // Convertir palabras a números
    const wordAmount = convertWordsToNumber(amountWords);
    if (wordAmount !== null) {
      const wordAmountWithCents = wordAmount + (parseInt(amountCents) / 100);
      console.log(`Monto en letras convertido a número: ${wordAmountWithCents}`);
      
      // Si no se detectó un monto numérico, usar el monto en letras
      if (!amount || isNaN(amount) || amount <= 0) {
        amount = wordAmountWithCents;
        console.log(`Usando monto extraído de letras: ${amount}`);
      } 
      // O verificar que coincidan aproximadamente (pueden haber pequeñas diferencias por redondeo)
      else if (Math.abs(amount - wordAmountWithCents) > 0.1) {
        console.log(`⚠️ Advertencia: Monto numérico (${amount}) no coincide con monto en letras (${wordAmountWithCents})`);
      }
    }
  }
  
  // Si aún no tenemos un monto, probar con otros patrones
  if (!amount || isNaN(amount) || amount <= 0) {
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Algunos patrones tienen grupos específicos para el monto
        let amountStr = match[1];
        
        // Si es un patrón de "SON: X CON Y/100 SOLES", necesitamos un procesamiento especial
        if (pattern.toString().includes("SON")) {
          // Este caso ya se manejó arriba, pero lo dejamos por si acaso
          continue;
        }
        
        // Limpiar y convertir a número
        amountStr = amountStr.replace(",", ".");
        const parsedAmount = parseFloat(amountStr);
        
        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          amount = parsedAmount;
          console.log(`Monto detectado con patrón general: ${amount}`);
          break;
        }
      }
    }
  }

  // Buscar número de factura/boleta
  for (const pattern of invoiceNumberPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Algunos patrones tienen formatos específicos (B001-000001)
      if (pattern.toString().includes("B([0-9]{3})")) {
        invoiceNumber = `B${match[1]}-${match[2]}`;
      } else if (pattern.toString().includes("F([0-9]{3})")) {
        invoiceNumber = `F${match[1]}-${match[2]}`;
      } else {
        invoiceNumber = match[1];
      }
      break;
    }
  }

  // Buscar dirección
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Si es el patrón específico para La Baguette
      if (pattern.toString().includes('SAN ISIDRO')) {
        // Buscar la dirección completa para La Baguette
        const baguetteAddressMatch = text.match(/JR\. LUIS SANCHEZ CERRO[^\n]+/i);
        if (baguetteAddressMatch) {
          address = baguetteAddressMatch[0].trim();
        } else {
          address = 'SAN ISIDRO, LIMA';
        }
      } else {
        address = match[1].trim();
      }
      break;
    }
  }
  
  // Si encontramos "CAJA" como dirección, ignorarla
  if (address === 'CAJA' || address === 'caja') {
    address = null;
  }
  
  // Buscar dirección en el texto completo si no se encontró con los patrones
  if (!address) {
    // Buscar patrones específicos para La Baguette
    const baguetteAddressMatch = text.match(/JR\.?\s+LUIS\s+SANCHEZ\s+CERRO[^\n]+/i);
    if (baguetteAddressMatch) {
      address = baguetteAddressMatch[0].trim();
    } else {
      // Buscar cualquier línea que parezca una dirección
      const lines = text.split('\n');
      for (const line of lines) {
        if ((line.includes('AV.') || line.includes('JR.') || line.includes('CALLE') || 
            line.includes('URB.') || line.includes('SAN ISIDRO')) && 
            line.length > 10 && !line.includes('RUC') && !line.includes('TOTAL')) {
          address = line.trim();
          break;
        }
      }
    }
  }

  // Buscar vendedor/mesero
  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match) {
      vendor = match[1].trim();
      break;
    }
  }

  // Buscar fecha de emisión
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      purchaseDate = match[1];
      break;
    }
  }

  // Generar slug del negocio basado en el nombre
  if (businessName) {
    // Detectar negocios específicos por nombre
    const lowerBusinessName = businessName.toLowerCase();
    
    if (lowerBusinessName.includes("la baguette") || lowerBusinessName.includes("labaguette")) {
      businessSlug = "la-baguette";
    } else if (lowerBusinessName.includes("starbucks")) {
      businessSlug = "starbucks";
    } else if (lowerBusinessName.includes("tambo") || lowerBusinessName.includes("tambo+")) {
      businessSlug = "tambo";
    } else if (lowerBusinessName.includes("metro")) {
      businessSlug = "metro";
    } else if (lowerBusinessName.includes("wong")) {
      businessSlug = "wong";
    } else if (lowerBusinessName.includes("plaza vea") || lowerBusinessName.includes("plazavea")) {
      businessSlug = "plaza-vea";
    } else if (lowerBusinessName.includes("tottus")) {
      businessSlug = "tottus";
    } else {
      // Convertir a minúsculas y reemplazar espacios por guiones
      businessSlug = businessName.toLowerCase()
        .replace(/\s+/g, '-')           // Espacios a guiones
        .replace(/[^a-z0-9-]/g, '')     // Eliminar caracteres especiales
        .replace(/-+/g, '-')            // Eliminar guiones duplicados
        .replace(/^-|-$/g, '');         // Eliminar guiones al inicio y final
    }
  }

  // Retornar la información extraída
  return {
    ruc,
    amount,
    amountInWords,
    businessName,
    businessSlug,
    address,
    vendor,
    items,
    location,
    purchaseDate,
    invoiceNumber
  };
}

/**
 * Convierte palabras a números (para procesar montos en letras)
 * @param {string} words - Palabras a convertir
 * @returns {number|null} - Número convertido o null si no se pudo convertir
 */
function convertWordsToNumber(words) {
  if (!words) return null;
  
  // Diccionario de palabras a números
  const wordValues = {
    'cero': 0,
    'un': 1, 'uno': 1, 'una': 1,
    'dos': 2,
    'tres': 3,
    'cuatro': 4,
    'cinco': 5,
    'seis': 6,
    'siete': 7,
    'ocho': 8,
    'nueve': 9,
    'diez': 10,
    'once': 11,
    'doce': 12,
    'trece': 13,
    'catorce': 14,
    'quince': 15,
    'dieciseis': 16, 'dieciséis': 16, 'diez y seis': 16,
    'diecisiete': 17, 'diez y siete': 17,
    'dieciocho': 18, 'diez y ocho': 18,
    'diecinueve': 19, 'diez y nueve': 19,
    'veinte': 20, 'veinti': 20,
    'veintiun': 21, 'veintiuno': 21, 'veinte y uno': 21, 'veinte y un': 21,
    'veintidos': 22, 'veintidós': 22, 'veinte y dos': 22,
    'veintitres': 23, 'veintitrés': 23, 'veinte y tres': 23,
    'veinticuatro': 24, 'veinte y cuatro': 24,
    'veinticinco': 25, 'veinte y cinco': 25,
    'veintiseis': 26, 'veintiséis': 26, 'veinte y seis': 26,
    'veintisiete': 27, 'veinte y siete': 27,
    'veintiocho': 28, 'veinte y ocho': 28,
    'veintinueve': 29, 'veinte y nueve': 29,
    'treinta': 30,
    'cuarenta': 40,
    'cincuenta': 50,
    'sesenta': 60,
    'setenta': 70,
    'ochenta': 80,
    'noventa': 90,
    'cien': 100, 'ciento': 100,
    'doscientos': 200, 'doscientas': 200,
    'trescientos': 300, 'trescientas': 300,
    'cuatrocientos': 400, 'cuatrocientas': 400,
    'quinientos': 500, 'quinientas': 500,
    'seiscientos': 600, 'seiscientas': 600,
    'setecientos': 700, 'setecientas': 700,
    'ochocientos': 800, 'ochocientas': 800,
    'novecientos': 900, 'novecientas': 900,
    'mil': 1000,
    'millón': 1000000, 'millon': 1000000, 'millones': 1000000
  };
  
  // Normalizar texto: convertir a minúsculas y eliminar acentos
  const normalizedWords = words.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Casos especiales
  if (normalizedWords === "cero") return 0;
  
  // Dividir en palabras
  const wordList = normalizedWords.split(" ");
  let result = 0;
  let currentNumber = 0;
  
  for (let i = 0; i < wordList.length; i++) {
    const word = wordList[i];
    
    // Ignorar palabras como "y", "con", etc.
    if (word === "y" || word === "con") continue;
    
    // Verificar si la palabra está en nuestro diccionario
    if (wordValues[word] !== undefined) {
      const value = wordValues[word];
      
      // Manejar casos especiales como "mil", "millón"
      if (value === 1000) {
        // Si no hay número acumulado, mil vale 1000
        currentNumber = currentNumber === 0 ? 1000 : currentNumber * 1000;
      } else if (value === 1000000) {
        // Similar para millón
        currentNumber = currentNumber === 0 ? 1000000 : currentNumber * 1000000;
        result += currentNumber;
        currentNumber = 0;
      } else if (value >= 100) {
        // Para centenas
        currentNumber += value;
      } else {
        // Para decenas y unidades
        currentNumber += value;
      }
    } else if (word.startsWith("veinti") && word.length > 6) {
      // Manejar casos como "veintiuno", "veintidos", etc.
      const suffix = word.substring(6);
      if (wordValues[suffix] !== undefined) {
        currentNumber += 20 + wordValues[suffix];
      }
    } else {
      // Palabra no reconocida, intentar con la siguiente
      console.log(`Palabra no reconocida en la conversión: ${word}`);
    }
  }
  
  // Sumar el último número acumulado
  result += currentNumber;
  
  return result > 0 ? result : null;
}

module.exports = {
  extractRUCAndAmount,
  convertWordsToNumber
};
