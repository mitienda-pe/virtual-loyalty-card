// functions/src/services/businessConfigService.js
const admin = require("firebase-admin");

/**
 * Servicio para gestionar configuraciones específicas de extracción de texto por negocio
 */
class BusinessConfigService {
  constructor() {
    this.db = admin.firestore();
    this.cache = new Map(); // Cache en memoria para configuraciones
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Obtiene la configuración de extracción para un negocio específico
   * @param {string} businessSlug - Slug del negocio
   * @returns {Promise<object|null>} - Configuración de extracción
   */
  async getExtractionConfig(businessSlug) {
    try {
      // Verificar cache
      const cached = this.getCachedConfig(businessSlug);
      if (cached) {
        console.log(`📋 Usando configuración cacheada para: ${businessSlug}`);
        return cached;
      }

      console.log(
        `🔍 Obteniendo configuración de extracción para: ${businessSlug}`
      );

      // Obtener configuración desde Firestore
      const businessDoc = await this.db
        .collection("businesses")
        .doc(businessSlug)
        .get();

      if (!businessDoc.exists) {
        console.log(`⚠️ Negocio no encontrado: ${businessSlug}`);
        return null;
      }

      const businessData = businessDoc.data();
      const extractionConfig = businessData.extractionConfig || null;

      // Cachear resultado
      this.setCachedConfig(businessSlug, extractionConfig);

      return extractionConfig;
    } catch (error) {
      console.error(
        `❌ Error obteniendo configuración para ${businessSlug}:`,
        error
      );
      return null;
    }
  }

  /**
   * Guarda o actualiza la configuración de extracción para un negocio
   * @param {string} businessSlug - Slug del negocio
   * @param {object} config - Configuración de extracción
   * @returns {Promise<boolean>} - true si se guardó exitosamente
   */
  async saveExtractionConfig(businessSlug, config) {
    try {
      console.log(
        `💾 Guardando configuración de extracción para: ${businessSlug}`
      );

      // Validar configuración
      const validatedConfig = this.validateConfig(config);

      // Actualizar en Firestore
      await this.db.collection("businesses").doc(businessSlug).update({
        extractionConfig: validatedConfig,
        extractionConfigUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Limpiar cache
      this.clearCachedConfig(businessSlug);

      console.log(`✅ Configuración guardada para: ${businessSlug}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Error guardando configuración para ${businessSlug}:`,
        error
      );
      return false;
    }
  }

  /**
   * Obtiene todas las configuraciones de extracción (para administrador)
   * @returns {Promise<object>} - Objeto con todas las configuraciones por businessSlug
   */
  async getAllExtractionConfigs() {
    try {
      console.log("🔍 Obteniendo todas las configuraciones de extracción");

      const businessesSnapshot = await this.db
        .collection("businesses")
        .where("extractionConfig", "!=", null)
        .get();

      const configs = {};

      businessesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.extractionConfig) {
          configs[doc.id] = {
            businessName: data.name,
            config: data.extractionConfig,
            updatedAt: data.extractionConfigUpdatedAt,
          };
        }
      });

      return configs;
    } catch (error) {
      console.error("❌ Error obteniendo todas las configuraciones:", error);
      return {};
    }
  }

  /**
   * Genera una configuración automática basada en comprobantes procesados anteriormente
   * @param {string} businessSlug - Slug del negocio
   * @param {number} sampleSize - Número de comprobantes a analizar
   * @returns {Promise<object|null>} - Configuración sugerida
   */
  async generateAutoConfig(businessSlug, sampleSize = 10) {
    try {
      console.log(
        `🤖 Generando configuración automática para: ${businessSlug}`
      );

      // Obtener comprobantes recientes del negocio
      const purchasesSnapshot = await this.db
        .collection("business_invoices")
        .doc(businessSlug)
        .collection("purchases")
        .orderBy("date", "desc")
        .limit(sampleSize)
        .get();

      if (purchasesSnapshot.empty) {
        console.log("⚠️ No hay comprobantes para analizar");
        return null;
      }

      const analysis = {
        businessNames: new Set(),
        addresses: new Set(),
        commonPatterns: {
          invoiceFormats: new Map(),
          amountPatterns: new Map(),
        },
      };

      // Analizar comprobantes
      purchasesSnapshot.forEach((doc) => {
        const data = doc.data();

        if (data.businessName) {
          analysis.businessNames.add(data.businessName.toLowerCase());
        }

        if (data.address && data.address !== "CAJA") {
          analysis.addresses.add(data.address);
        }

        if (data.invoiceNumber) {
          const format = this.detectInvoiceFormat(data.invoiceNumber);
          const count = analysis.commonPatterns.invoiceFormats.get(format) || 0;
          analysis.commonPatterns.invoiceFormats.set(format, count + 1);
        }
      });

      // Generar configuración basada en el análisis
      const suggestedConfig = this.buildConfigFromAnalysis(analysis);

      console.log(`✅ Configuración automática generada para: ${businessSlug}`);
      return suggestedConfig;
    } catch (error) {
      console.error(`❌ Error generando configuración automática:`, error);
      return null;
    }
  }

  /**
   * Valida una configuración de extracción
   * @param {object} config - Configuración a validar
   * @returns {object} - Configuración validada
   */
  validateConfig(config) {
    const validated = {};

    // Validar aliases
    if (config.aliases && Array.isArray(config.aliases)) {
      validated.aliases = config.aliases.filter(
        (alias) => typeof alias === "string" && alias.trim().length > 0
      );
    }

    // Validar patrones de dirección
    if (config.addressPatterns && Array.isArray(config.addressPatterns)) {
      validated.addressPatterns = config.addressPatterns.filter((pattern) => {
        try {
          new RegExp(pattern, "i");
          return true;
        } catch {
          return false;
        }
      });
    }

    // Validar patrones de monto específicos
    if (
      config.specificAmountPatterns &&
      Array.isArray(config.specificAmountPatterns)
    ) {
      validated.specificAmountPatterns = config.specificAmountPatterns.filter(
        (pattern) => {
          try {
            new RegExp(pattern, "i");
            return true;
          } catch {
            return false;
          }
        }
      );
    }

    // Validar patrones de factura
    if (config.invoicePatterns && Array.isArray(config.invoicePatterns)) {
      validated.invoicePatterns = config.invoicePatterns.filter((pattern) => {
        try {
          new RegExp(pattern, "i");
          return true;
        } catch {
          return false;
        }
      });
    }

    // Agregar metadatos
    validated.version = config.version || "1.0";
    validated.createdAt = config.createdAt || new Date().toISOString();
    validated.updatedAt = new Date().toISOString();

    return validated;
  }

  /**
   * Detecta el formato de un número de factura
   * @param {string} invoiceNumber - Número de factura
   * @returns {string} - Formato detectado
   */
  detectInvoiceFormat(invoiceNumber) {
    if (/^[BF]\d{3}-\d{6,8}$/.test(invoiceNumber)) {
      return "standard"; // B001-12345678
    }
    if (/^[A-Z]{2,4}\d+$/.test(invoiceNumber)) {
      return "alphanumeric"; // FACT12345
    }
    if (/^\d{6,}$/.test(invoiceNumber)) {
      return "numeric"; // 123456
    }
    return "other";
  }

  /**
   * Construye configuración basada en análisis de comprobantes
   * @param {object} analysis - Análisis de comprobantes
   * @returns {object} - Configuración sugerida
   */
  buildConfigFromAnalysis(analysis) {
    const config = {
      version: "1.0",
      autoGenerated: true,
      generatedAt: new Date().toISOString(),
    };

    // Generar aliases basados en nombres encontrados
    if (analysis.businessNames.size > 0) {
      config.aliases = Array.from(analysis.businessNames);
    }

    // Generar patrones de dirección basados en direcciones encontradas
    if (analysis.addresses.size > 0) {
      config.addressPatterns = Array.from(analysis.addresses).map((address) => {
        // Crear patrón regex escapando caracteres especiales
        const escaped = address.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return escaped;
      });
    }

    // Generar patrones de factura basados en formatos comunes
    const mostCommonFormat = Array.from(
      analysis.commonPatterns.invoiceFormats.entries()
    ).sort((a, b) => b[1] - a[1])[0];

    if (mostCommonFormat) {
      const [format] = mostCommonFormat;
      config.invoicePatterns = this.getPatternsByFormat(format);
    }

    return config;
  }

  /**
   * Obtiene patrones regex según el formato de factura
   * @param {string} format - Formato de factura
   * @returns {string[]} - Patrones regex
   */
  getPatternsByFormat(format) {
    switch (format) {
      case "standard":
        return ["/([BF]\\s*[0-9]{3}\\s*-\\s*[0-9]{6,8})/i"];
      case "alphanumeric":
        return ["/([A-Z]{2,4}[0-9]+)/i"];
      case "numeric":
        return ["/([0-9]{6,})/i"];
      default:
        return ["/([A-Z0-9\\-]{4,})/i"];
    }
  }

  /**
   * Obtiene configuración desde cache
   * @param {string} businessSlug - Slug del negocio
   * @returns {object|null} - Configuración cacheada o null
   */
  getCachedConfig(businessSlug) {
    const cached = this.cache.get(businessSlug);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.config;
    }
    return null;
  }

  /**
   * Guarda configuración en cache
   * @param {string} businessSlug - Slug del negocio
   * @param {object} config - Configuración a cachear
   */
  setCachedConfig(businessSlug, config) {
    this.cache.set(businessSlug, {
      config,
      timestamp: Date.now(),
    });
  }

  /**
   * Limpia configuración específica del cache
   * @param {string} businessSlug - Slug del negocio
   */
  clearCachedConfig(businessSlug) {
    this.cache.delete(businessSlug);
  }

  /**
   * Limpia todo el cache
   */
  clearAllCache() {
    this.cache.clear();
  }

  /**
   * Prueba una configuración contra un texto de ejemplo
   * @param {object} config - Configuración a probar
   * @param {string} sampleText - Texto de ejemplo
   * @returns {object} - Resultado de la prueba
   */
  testConfig(config, sampleText) {
    const { extractRUCAndAmount } = require("../utils/textExtraction");

    try {
      const result = extractRUCAndAmount(sampleText, "test-business", config);

      return {
        success: true,
        result,
        confidence: result.confidence,
        extractedFields: {
          ruc: !!result.ruc,
          amount: !!result.amount,
          invoiceId: !!result.invoiceId,
          businessName: !!result.businessName,
          address: !!result.address,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        confidence: 0,
      };
    }
  }

  /**
   * Obtiene estadísticas de uso de configuraciones
   * @param {string} businessSlug - Slug del negocio
   * @returns {Promise<object>} - Estadísticas de uso
   */
  async getConfigStats(businessSlug) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Obtener comprobantes procesados en los últimos 30 días
      const recentPurchases = await this.db
        .collection("business_invoices")
        .doc(businessSlug)
        .collection("purchases")
        .where("date", ">=", thirtyDaysAgo)
        .get();

      let successfulExtractions = 0;
      let totalProcessed = recentPurchases.size;

      recentPurchases.forEach((doc) => {
        const data = doc.data();
        // Considerar exitosa si tiene RUC, monto y número de factura
        if (data.ruc && data.amount && data.invoiceNumber) {
          successfulExtractions++;
        }
      });

      const successRate =
        totalProcessed > 0 ? (successfulExtractions / totalProcessed) * 100 : 0;

      return {
        totalProcessed,
        successfulExtractions,
        successRate: Math.round(successRate * 100) / 100,
        period: "30 days",
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        `❌ Error obteniendo estadísticas para ${businessSlug}:`,
        error
      );
      return {
        totalProcessed: 0,
        successfulExtractions: 0,
        successRate: 0,
        error: error.message,
      };
    }
  }
}

// Instancia singleton
const businessConfigService = new BusinessConfigService();

module.exports = {
  BusinessConfigService,
  businessConfigService,
};
