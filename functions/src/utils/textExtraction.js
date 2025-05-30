// functions/src/utils/textExtraction.js

/**
 * Configuraciones específicas por negocio para mejorar la extracción de datos
 * Estas configuraciones se pueden almacenar en Firestore y ser editables desde el admin
 */
const DEFAULT_BUSINESS_CONFIGS = {
  "la-baguette": {
    aliases: ["la baguette", "labaguette", "corporacion baguetera", "baguette"],
    addressPatterns: [
      /JR\.?\s+LUIS\s+SANCHEZ\s+CERRO[^\n]+/i,
      /SAN ISIDRO[^\n]*LIMA[^\n]*LIMA/i,
    ],
    specificAmountPatterns: [/TOTAL\s+SOLES\s+S\/\s*([0-9]+[.,][0-9]{2})/i],
    invoicePatterns: [/B\s*([0-9]{3})\s*-\s*([0-9]{6,8})/i],
  },
  starbucks: {
    aliases: ["starbucks", "starbucks coffee"],
    addressPatterns: [/STORE\s+#[0-9]+[^\n]+/i, /TIENDA\s+#[0-9]+[^\n]+/i],
  },
  tambo: {
    aliases: ["tambo", "tambo+", "tambo plus"],
    addressPatterns: [/AV\.?\s+[^\n]+/i, /JR\.?\s+[^\n]+/i],
  },
};

/**
 * Patrones base que funcionan para la mayoría de negocios peruanos
 */
const BASE_PATTERNS = {
  ruc: [
    /R\.U\.C\.\s*:?\s*([0-9]{11})/i,
    /RUC\s*:?\s*([0-9]{11})/i,
    /R\.U\.C\.?\s*([0-9]{11})/i,
  ],

  businessName: [
    /RAZON\s+SOCIAL\s*:?\s*(.+?)(?=\n|RUC|DIRECCION|$)/i,
    /NOMBRE\s+COMERCIAL\s*:?\s*(.+?)(?=\n|RUC|DIRECCION|$)/i,
    /DENOMINACION\s*:?\s*(.+?)(?=\n|RUC|DIRECCION|$)/i,
  ],

  address: [
    /DIRECCION\s*:?\s*(.+?)(?=\n|RUC|TELEFONO|$)/i,
    /DOMICILIO\s+FISCAL\s*:?\s*(.+?)(?=\n|RUC|TELEFONO|$)/i,
    /DIR\s*:?\s*(.+?)(?=\n|RUC|TELEFONO|$)/i,
  ],

  amount: [
    // Patrones más específicos primero
    /IMPORTE\s+TOTAL\s*:?\s*S\/\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s+A\s+PAGAR\s*:?\s*S\/\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s+SOLES\s*:?\s*S\/\s*([0-9]+[.,][0-9]{2})/i,
    /TOTAL\s+VENTA\s*:?\s*S\/\s*([0-9]+[.,][0-9]{2})/i,
    // Patrones más generales
    /TOTAL\s*:?\s*S\/\s*([0-9]+[.,][0-9]{2})/i,
    /IMPORTE\s*:?\s*S\/\s*([0-9]+[.,][0-9]{2})/i,
    /S\/\s*([0-9]+[.,][0-9]{2})\s*(?:SOLES|PEN|$)/i,
  ],

  amountInWords: [/SON\s*:?\s*(.+?)\s+[YC]\s+([0-9]{2})\/100\s+SOLES/i],

  invoiceNumber: [
    // Patrones más específicos para boletas y facturas
    /(?:BOLETA|FACTURA)\s+(?:ELECTRONICA\s+)?(?:DE\s+VENTA\s+)?(?:N[°o]?\s*)?([BFT][0-9]{3}-[0-9]{6,8})/i,
    /(?:TICKET|COMPROBANTE)\s*(?:N[°o]?\s*)?:?\s*([A-Z0-9\-]{4,})/i,
    // Patrones para formato estándar peruano
    /([BFT]\s*[0-9]{3}\s*-\s*[0-9]{6,8})/i,
    // Patrones más generales
    /N[°o]?\s*:?\s*([A-Z0-9\-]{4,})/i,
  ],

  date: [
    /FECHA\s+DE\s+EMISION\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    /FECHA\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    /EMISION\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    /([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
  ],

  vendor: [
    /MOZO\s*:?\s*(.+?)(?=\n|$)/i,
    /VENDEDOR\s*:?\s*(.+?)(?=\n|$)/i,
    /CAJERO\s*:?\s*(.+?)(?=\n|$)/i,
    /ATENDIDO\s+POR\s*:?\s*(.+?)(?=\n|$)/i,
    /ASESOR\s*:?\s*(.+?)(?=\n|$)/i,
  ],
};

/**
 * Extrae información del texto usando configuración específica del negocio si está disponible
 * @param {string} text - Texto extraído del comprobante
 * @param {string} [knownBusinessSlug] - Slug del negocio si ya se conoce
 * @param {object} [businessConfig] - Configuración específica del negocio
 * @returns {object} - Información extraída del comprobante
 */
function extractRUCAndAmount(
  text,
  knownBusinessSlug = null,
  businessConfig = null
) {
  console.log("🔍 Iniciando extracción de datos del comprobante...");

  const result = {
    ruc: null,
    amount: null,
    amountInWords: null,
    businessName: null,
    businessSlug: "default",
    address: null,
    vendor: null,
    location: null,
    purchaseDate: null,
    invoiceId: null,
    extractedText: text,
    confidence: 0, // Indicador de confianza en la extracción
  };

  // 1. Extraer RUC (siempre usando patrones base)
  result.ruc = extractWithPatterns(text, BASE_PATTERNS.ruc);
  if (result.ruc) {
    console.log(`✅ RUC encontrado: ${result.ruc}`);
    result.confidence += 30;
  }

  // 2. Si conocemos el negocio, usar su configuración específica
  if (knownBusinessSlug && businessConfig) {
    console.log(
      `🎯 Usando configuración específica para: ${knownBusinessSlug}`
    );
    result.businessSlug = knownBusinessSlug;
    result.confidence += 20;

    // Extraer con patrones específicos del negocio
    if (businessConfig.specificAmountPatterns) {
      result.amount = extractAmountWithPatterns(
        text,
        businessConfig.specificAmountPatterns
      );
    }

    if (businessConfig.addressPatterns) {
      result.address = extractWithPatterns(
        text,
        businessConfig.addressPatterns
      );
    }

    if (businessConfig.invoicePatterns) {
      result.invoiceId = extractInvoiceWithPatterns(
        text,
        businessConfig.invoicePatterns
      );
    }
  }

  // 3. Si no tenemos configuración específica o no encontramos datos, usar patrones base
  if (!result.amount) {
    result.amount = extractAmountWithPatterns(text, BASE_PATTERNS.amount);
    if (result.amount) {
      console.log(`💰 Monto encontrado: ${result.amount}`);
      result.confidence += 25;
    }
  }

  if (!result.invoiceId) {
    result.invoiceId = extractInvoiceWithPatterns(
      text,
      BASE_PATTERNS.invoiceNumber
    );
    if (result.invoiceId) {
      console.log(`🧾 Número de comprobante encontrado: ${result.invoiceId}`);
      result.confidence += 20;
    }
  }

  // 4. Extraer nombre del negocio si no lo conocemos
  if (!result.businessName) {
    result.businessName =
      extractWithPatterns(text, BASE_PATTERNS.businessName) ||
      extractBusinessNameFromLines(text);
    if (result.businessName) {
      console.log(`🏢 Nombre del negocio: ${result.businessName}`);
      result.businessSlug = generateBusinessSlug(result.businessName);
      result.confidence += 15;
    }
  }

  // 5. Extraer dirección si no la tenemos
  if (!result.address) {
    result.address =
      extractWithPatterns(text, BASE_PATTERNS.address) ||
      extractAddressFromText(text);
    if (result.address && result.address !== "CAJA") {
      console.log(`📍 Dirección encontrada: ${result.address}`);
      result.confidence += 10;
    } else {
      result.address = null;
    }
  }

  // 6. Extraer otros campos
  result.purchaseDate = extractWithPatterns(text, BASE_PATTERNS.date);
  result.vendor = extractWithPatterns(text, BASE_PATTERNS.vendor);

  // 7. Intentar extraer monto en palabras para validación
  const amountInWordsMatch = text.match(BASE_PATTERNS.amountInWords[0]);
  if (amountInWordsMatch) {
    result.amountInWords = amountInWordsMatch[0].trim();
    const wordAmount = convertWordsToNumber(amountInWordsMatch[1]);
    const cents = parseInt(amountInWordsMatch[2]) / 100;

    if (wordAmount !== null) {
      const totalFromWords = wordAmount + cents;
      if (!result.amount) {
        result.amount = totalFromWords;
        console.log(`💰 Monto extraído de palabras: ${result.amount}`);
      } else if (Math.abs(result.amount - totalFromWords) > 0.1) {
        console.warn(
          `⚠️ Discrepancia en montos: numérico=${result.amount}, palabras=${totalFromWords}`
        );
      }
    }
  }

  console.log(`📊 Extracción completada con confianza: ${result.confidence}%`);
  return result;
}

/**
 * Extrae un valor usando una lista de patrones regulares
 */
function extractWithPatterns(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extrae monto con validación adicional
 */
function extractAmountWithPatterns(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanAmount = match[1].replace(",", ".");
      const amount = parseFloat(cleanAmount);
      if (!isNaN(amount) && amount > 0 && amount < 10000) {
        // Validación básica
        return amount;
      }
    }
  }
  return null;
}

/**
 * Extrae número de comprobante con formateo
 */
function extractInvoiceWithPatterns(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let invoiceNumber = match[1] || match[0];

      // Limpiar y formatear el número
      invoiceNumber = invoiceNumber.replace(/\s+/g, "").toUpperCase();

      // Validar que tenga el formato esperado
      if (invoiceNumber.length >= 4 && /[A-Z0-9\-]/.test(invoiceNumber)) {
        return invoiceNumber;
      }
    }
  }
  return null;
}

/**
 * Intenta extraer el nombre del negocio de las primeras líneas del texto
 */
function extractBusinessNameFromLines(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    // Saltar líneas que claramente no son nombres de negocios
    if (/^(RUC|FACTURA|BOLETA|TICKET|FECHA|HORA)/i.test(line)) {
      continue;
    }

    // Buscar líneas que parezcan nombres de negocios
    if (line.length > 3 && line.length < 100 && !/^[0-9\-\/]+$/.test(line)) {
      return line;
    }
  }

  return null;
}

/**
 * Extrae dirección del texto completo cuando los patrones base fallan
 */
function extractAddressFromText(text) {
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Buscar líneas que contengan indicadores de dirección
    if (
      (trimmedLine.includes("AV.") ||
        trimmedLine.includes("JR.") ||
        trimmedLine.includes("CALLE") ||
        trimmedLine.includes("URB.") ||
        trimmedLine.includes("PSJE.")) &&
      trimmedLine.length > 10 &&
      !trimmedLine.includes("RUC") &&
      !trimmedLine.includes("TOTAL") &&
      trimmedLine !== "CAJA"
    ) {
      return trimmedLine;
    }
  }

  return null;
}

/**
 * Genera un slug para el negocio basado en su nombre
 */
function generateBusinessSlug(businessName) {
  if (!businessName) return "default";

  // Verificar si coincide con algún negocio conocido
  const lowerName = businessName.toLowerCase();

  for (const [slug, config] of Object.entries(DEFAULT_BUSINESS_CONFIGS)) {
    if (
      config.aliases &&
      config.aliases.some(
        (alias) =>
          lowerName.includes(alias.toLowerCase()) ||
          alias.toLowerCase().includes(lowerName)
      )
    ) {
      return slug;
    }
  }

  // Generar slug genérico
  return (
    businessName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "default"
  );
}

/**
 * Convierte palabras numéricas a números
 */
function convertWordsToNumber(words) {
  if (!words) return null;

  const wordValues = {
    cero: 0,
    uno: 1,
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
    veinte: 20,
    treinta: 30,
    cuarenta: 40,
    cincuenta: 50,
    sesenta: 60,
    setenta: 70,
    ochenta: 80,
    noventa: 90,
    cien: 100,
    ciento: 100,
    mil: 1000,
  };

  const normalizedWords = words
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const wordList = normalizedWords.split(" ");
  let result = 0;
  let currentNumber = 0;

  for (const word of wordList) {
    if (word === "y" || word === "con") continue;

    if (wordValues[word] !== undefined) {
      const value = wordValues[word];

      if (value === 1000) {
        currentNumber = currentNumber === 0 ? 1000 : currentNumber * 1000;
      } else if (value >= 100) {
        currentNumber += value;
      } else {
        currentNumber += value;
      }
    }
  }

  result += currentNumber;
  return result > 0 ? result : null;
}

/**
 * Función para obtener configuración de negocio desde Firestore (para usar en el futuro)
 * @param {string} businessSlug - Slug del negocio
 * @returns {Promise<object|null>} - Configuración del negocio
 */
async function getBusinessExtractionConfig(businessSlug) {
  // Esta función se implementaría para cargar configuraciones desde Firestore
  // Por ahora retorna la configuración por defecto si existe
  return DEFAULT_BUSINESS_CONFIGS[businessSlug] || null;
}

module.exports = {
  extractRUCAndAmount,
  convertWordsToNumber,
  getBusinessExtractionConfig,
  DEFAULT_BUSINESS_CONFIGS,
  BASE_PATTERNS,
};
