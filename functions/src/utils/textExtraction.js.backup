/**
 * Extrae información detallada del texto del comprobante
 * @param {string} text - Texto extraído del comprobante
 * @param {object} [customPatterns] - Patrones personalizados por negocio
 * @returns {object} - Información extraída del comprobante
 */
function extractRUCAndAmount(text, customPatterns = {}) {
  // Patrones para RUC
  const rucPatterns = customPatterns.rucPatterns || [
    /R\.U\.C\.\s*:?\s*([0-9]{11})/i,
    /RUC\s*:?\s*([0-9]{11})/i,
    /R\.U\.C\.?\s*([0-9]{11})/i,
  ];

  // Patrones para número de comprobante (factura/boleta)
  const invoiceNumberPatterns = customPatterns.invoiceNumberPatterns || [
    // Patrones específicos para boletas y facturas con formato estándar
    /NRO\s+DCTO\s*:?([A-Z0-9\-]+)/i, // Para "NRO DCTO :B011-00524671"
    /([BF]\d{3}-\d{8})/i, // Patrón específico B011-00524671, F001-12345678
    /([BF]\d{3}\s*-\s*\d{8})/i, // Con espacios alrededor del guión
    /BOLETA\s+DE\s+VENTA\s+ELECTRONICA[^\n]*\s*([A-Z0-9\-]+)/i,
    /(?:Factura|Boleta|Ticket|Comprobante)\s*(?:N[°o]?|No\.?|#|:)\s*([A-Z0-9\-]{4,})/i,
    /N[°o]?\s*([A-Z0-9\-]{4,})/i,
    /([FBT][A-Z0-9\-]{3,})/i,
    /TICKET\s*:?\s*([A-Z0-9\-]+)/i,
    /DOCUMENTO\s*:?\s*([A-Z0-9\-]+)/i,
    /N°\s*:?\s*([A-Z0-9\-]+)/i,
    /NRO\.?\s*:?\s*([A-Z0-9\-]+)/i,
    /B\s*([0-9]{3})\s*-\s*([0-9]{6,8})/i,
    /F\s*([0-9]{3})\s*-\s*([0-9]{6,8})/i,
  ];

  // Patrones para monto total
  const amountPatterns = [
    /TOTAL\s+SOLES\s+S\/\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s+DEL\s+TICKET\s*:?\s*S\/\.?\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s+VENTA\s*:?\s*S\/\.?\s*([0-9]+[.,][0-9]{2})/i,
    /IMPORTE\s+TOTAL\s*:?\s*S\/\.?\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s*:?\s*S\/\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s*:?\s*S\/\.?\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s*:?\s*([0-9]+[.,][0-9]{2})/i,
    /IMPORTE\s*:?\s*S\/\.?\s*([0-9]+[.,][0-9]{2})/i,
    /S\/\s*([0-9]+[.,][0-9]{2})\s*(SOLES|PEN|S\.|$)/i,
  ];

  // Patrones para razón social
  const businessNamePatterns = [
    /RAZON SOCIAL\s*:?\s*(.+?)(?=\n|$)/i,
    /NOMBRE COMERCIAL\s*:?\s*(.+?)(?=\n|$)/i,
    /DENOMINACION\s*:?\s*(.+?)(?=\n|$)/i,
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
    /SAN ISIDRO[^\n]*LIMA[^\n]*LIMA/i,
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
    /FECHA DE EMISION\s*:?\s*([0-9]{2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    /FECHA\s*:?\s*([0-9]{2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    /([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    /([0-9]{1,2}\-[0-9]{1,2}\-[0-9]{2,4})/i,
  ];

  // Variables para almacenar la información extraída
  let ruc = null;
  let amount = null;
  let amountInWords = null;
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

  // Buscar número de comprobante
  for (const pattern of invoiceNumberPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Priorizar patrones específicos
      if (pattern.toString().includes("NRO\\s+DCTO")) {
        // Para "NRO DCTO :B011-00524671"
        invoiceNumber = match[1].trim();
        console.log(`🧾 Número de comprobante detectado (NRO DCTO): ${invoiceNumber}`);
      } else if (/([BF]\d{3}-\d{8})/i.test(match[1])) {
        // Para formatos exactos como B011-00524671
        invoiceNumber = match[1].toUpperCase();
        console.log(`🧾 Número de comprobante detectado (formato directo): ${invoiceNumber}`);
      } else if (/B\s*([0-9]{3})\s*-\s*([0-9]{6,8})/i.test(match[0])) {
        invoiceNumber = match[0].replace(/\s+/g, "").toUpperCase();
        console.log(`🧾 Número de comprobante detectado (B con espacios): ${invoiceNumber}`);
      } else if (/F\s*([0-9]{3})\s*-\s*([0-9]{6,8})/i.test(match[0])) {
        invoiceNumber = match[0].replace(/\s+/g, "").toUpperCase();
        console.log(`🧾 Número de comprobante detectado (F con espacios): ${invoiceNumber}`);
      } else {
        invoiceNumber = match[1].trim();
        console.log(`🧾 Número de comprobante detectado (genérico): ${invoiceNumber}`);
      }
      break;
    } else if (match && match[2]) {
      // Para patrones que capturan serie y número por separado
      invoiceNumber = `${match[1]}-${match[2]}`;
      console.log(`🧾 Número de comprobante detectado (serie-número): ${invoiceNumber}`);
      break;
    }
  }

  // Buscar razón social
  for (const pattern of businessNamePatterns) {
    const match = text.match(pattern);
    if (match) {
      businessName = match[1].trim();
      break;
    }
  }

  // Si no se encontró con patrones, intentar extraer razón social de las primeras líneas
  if (!businessName) {
    const lines = text.split("\n");
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (
        firstLine &&
        firstLine.length > 3 &&
        !/^(RUC|FACTURA|BOLETA|TICKET)/i.test(firstLine)
      ) {
        businessName = firstLine;
      } else if (lines.length > 1) {
        const secondLine = lines[1].trim();
        if (
          secondLine &&
          secondLine.length > 3 &&
          !/^(RUC|FACTURA|BOLETA|TICKET)/i.test(secondLine)
        ) {
          businessName = secondLine;
        }
      }
    }
  }

  // Generar slug del negocio basado en el nombre
  if (businessName) {
    const lowerBusinessName = businessName.toLowerCase();
    if (
      lowerBusinessName.includes("la baguette") ||
      lowerBusinessName.includes("labaguette")
    ) {
      businessSlug = "la-baguette";
    } else if (lowerBusinessName.includes("starbucks")) {
      businessSlug = "starbucks";
    } else if (
      lowerBusinessName.includes("tambo") ||
      lowerBusinessName.includes("tambo+")
    ) {
      businessSlug = "tambo";
    } else if (lowerBusinessName.includes("metro")) {
      businessSlug = "metro";
    } else if (lowerBusinessName.includes("wong")) {
      businessSlug = "wong";
    } else if (
      lowerBusinessName.includes("plaza vea") ||
      lowerBusinessName.includes("plazavea")
    ) {
      businessSlug = "plaza-vea";
    } else if (lowerBusinessName.includes("tottus")) {
      businessSlug = "tottus";
    } else {
      businessSlug = businessName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }
  }

  // Buscar monto total - Primero "Importe Total"
  let importeTotalPattern = /Importe\s+Total\s+S\/\s*:?\s*([0-9]+[.,][0-9]{2})/i;
  let importeTotalResult = text.match(importeTotalPattern);
  if (importeTotalResult && importeTotalResult[1]) {
    const cleanAmount = importeTotalResult[1].replace(",", ".");
    amount = parseFloat(cleanAmount);
  }

  // Si no encontramos "Importe Total", buscar "Total a Pagar"
  if (!amount || isNaN(amount) || amount <= 0) {
    const totalPagarMatch = text.match(
      /Total\s+a\s+Pagar\s+S\/\s*:?\s*([0-9]+[.,][0-9]{2})/i
    );
    if (totalPagarMatch && totalPagarMatch[1]) {
      const cleanAmount = totalPagarMatch[1].replace(",", ".");
      amount = parseFloat(cleanAmount);
    }
  }

  // Buscar el monto en letras
  const amountInWordsMatch = text.match(
    /SON\s*:?\s*(.+?)\s+[YC]\s+([0-9]{2})\/100\s+SOLES/i
  );
  if (amountInWordsMatch) {
    amountInWords = amountInWordsMatch[0].trim();
    const amountWords = amountInWordsMatch[1].trim();
    const amountCents = amountInWordsMatch[2];
    const wordAmount = convertWordsToNumber(amountWords);
    if (wordAmount !== null) {
      const wordAmountWithCents = wordAmount + parseInt(amountCents) / 100;
      // Si no se detectó un monto numérico, usar el monto en letras
      if (!amount || isNaN(amount) || amount <= 0) {
        amount = wordAmountWithCents;
      }
    }
  }

  // Si aún no tenemos un monto, probar con otros patrones
  if (!amount || isNaN(amount) || amount <= 0) {
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        let amountStr = match[1];
        amountStr = amountStr.replace(",", ".");
        const parsedAmount = parseFloat(amountStr);

        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          amount = parsedAmount;
          break;
        }
      }
    }
  }

  // Buscar dirección
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.toString().includes("SAN ISIDRO")) {
        const baguetteAddressMatch = text.match(/JR\. LUIS SANCHEZ CERRO[^\n]+/i);
        if (baguetteAddressMatch) {
          address = baguetteAddressMatch[0].trim();
        } else {
          address = "SAN ISIDRO, LIMA";
        }
      } else {
        address = match[1].trim();
      }
      break;
    }
  }

  // Si encontramos "CAJA" como dirección, ignorarla
  if (address === "CAJA" || address === "caja") {
    address = null;
  }

  // Buscar dirección en el texto completo si no se encontró con los patrones
  if (!address) {
    const baguetteAddressMatch = text.match(/JR\.?\s+LUIS\s+SANCHEZ\s+CERRO[^\n]+/i);
    if (baguetteAddressMatch) {
      address = baguetteAddressMatch[0].trim();
    } else {
      const lines = text.split("\n");
      for (const line of lines) {
        if (
          (line.includes("AV.") ||
            line.includes("JR.") ||
            line.includes("CALLE") ||
            line.includes("URB.") ||
            line.includes("SAN ISIDRO")) &&
          line.length > 10 &&
          !line.includes("RUC") &&
          !line.includes("TOTAL")
        ) {
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

  // Intentar extraer productos/servicios del texto
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Buscar líneas que contengan información de productos
    // Patrón para cantidad, descripción y precio: "1.000 BAGUETTE FRANCES X    4.90    4.90"
    const itemPattern1 = /^([0-9]+(?:\.[0-9]+)?)\s+(.+?)\s+([0-9]+[.,][0-9]{2})\s+([0-9]+[.,][0-9]{2})$/;
    const match1 = line.match(itemPattern1);
    
    if (match1) {
      const quantity = parseFloat(match1[1]);
      const description = match1[2].trim().replace(/\s+X\s*$/, ''); // Remover 'X' al final
      const unitPrice = parseFloat(match1[3].replace(',', '.'));
      const subtotal = parseFloat(match1[4].replace(',', '.'));
      
      items.push({
        quantity,
        description,
        unitPrice,
        subtotal
      });
      
      console.log(`🛒 Producto detectado: ${quantity} x ${description} - S/${subtotal}`);
    }
    
    // Patrón alternativo más simple para descripciones y precios
    const itemPattern2 = /^([A-Za-z][A-Za-z0-9\s\.]+)\s+([0-9]+[.,][0-9]{2})$/;
    const match2 = line.match(itemPattern2);
    
    if (match2 && !match1) { // Solo si no coincidió con el patrón anterior
      const description = match2[1].trim();
      const price = parseFloat(match2[2].replace(',', '.'));
      
      // Filtrar líneas que no parecen productos (totales, etc.)
      if (!/^(TOTAL|SUBTOTAL|IGV|DESCUENTO|IMPORTE)/i.test(description) && 
          description.length > 3 && price > 0) {
        items.push({
          quantity: 1,
          description,
          unitPrice: price,
          subtotal: price
        });
        
        console.log(`🛒 Producto detectado (simple): ${description} - S/${price}`);
      }
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
    items: items.length > 0 ? items : [], // Asegurar que siempre sea un array
    location,
    purchaseDate,
    invoiceId: invoiceNumber, // Agregar como invoiceId también para compatibilidad
    invoiceNumber,
  };
}

/**
 * Convierte palabras a números (para procesar montos en letras)
 * @param {string} words - Palabras a convertir
 * @returns {number|null} - Número convertido o null si no se pudo convertir
 */
function convertWordsToNumber(words) {
  if (!words) return null;

  const wordValues = {
    cero: 0,
    un: 1,
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    dieciseis: 16,
    dieciséis: 16,
    "diez y seis": 16,
    diecisiete: 17,
    "diez y siete": 17,
    dieciocho: 18,
    "diez y ocho": 18,
    diecinueve: 19,
    "diez y nueve": 19,
    veinte: 20,
    veinti: 20,
    veintiun: 21,
    veintiuno: 21,
    "veinte y uno": 21,
    "veinte y un": 21,
    veintidos: 22,
    veintidós: 22,
    "veinte y dos": 22,
    veintitres: 23,
    veintitrés: 23,
    "veinte y tres": 23,
    veinticuatro: 24,
    "veinte y cuatro": 24,
    veinticinco: 25,
    "veinte y cinco": 25,
    veintiseis: 26,
    veintiséis: 26,
    "veinte y seis": 26,
    veintisiete: 27,
    "veinte y siete": 27,
    veintiocho: 28,
    "veinte y ocho": 28,
    veintinueve: 29,
    "veinte y nueve": 29,
    treinta: 30,
    cuarenta: 40,
    cincuenta: 50,
    sesenta: 60,
    setenta: 70,
    ochenta: 80,
    noventa: 90,
    cien: 100,
    ciento: 100,
    doscientos: 200,
    doscientas: 200,
    trescientos: 300,
    trescientas: 300,
    cuatrocientos: 400,
    cuatrocientas: 400,
    quinientos: 500,
    quinientas: 500,
    seiscientos: 600,
    seiscientas: 600,
    setecientos: 700,
    setecientas: 700,
    ochocientos: 800,
    ochocientas: 800,
    novecientos: 900,
    novecientas: 900,
    mil: 1000,
    millón: 1000000,
    millon: 1000000,
    millones: 1000000,
  };

  // Normalizar texto
  words = words
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Casos especiales
  if (words === "cero") return 0;

  const tokens = words.split(/\s+/);
  let result = 0;
  let currentNumber = 0;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    
    // Ignorar palabras conectoras
    if (word === "y" || word === "con") continue;

    const value = wordValues[word];
    if (value !== undefined) {
      if (value === 1000 || value === 1000000) {
        if (currentNumber === 0) currentNumber = 1;
        if (value === 1000000) {
          result += currentNumber * value;
          currentNumber = 0;
        } else {
          currentNumber *= value;
        }
      } else if (value === 100 && currentNumber !== 0) {
        currentNumber *= value;
      } else {
        currentNumber += value;
      }
    } else if (word.startsWith("veinti") && word.length > 6) {
      const suffix = word.substring(6);
      if (wordValues[suffix] !== undefined) {
        currentNumber += 20 + wordValues[suffix];
      }
    }
  }

  result += currentNumber;
  return result > 0 ? result : null;
}

module.exports = {
  extractRUCAndAmount,
  convertWordsToNumber,
};