// functions/src/api/extractionConfigAPI.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors");
const { businessConfigService } = require("../services/businessConfigService");

/**
 * API para gestionar configuraciones de extracción de texto por negocio
 */
const extractionConfigAPI = onRequest(
  {
    cors: [
      "http://localhost:5173",
      "https://virtual-loyalty-card-e37c9.web.app",
      "https://virtual-loyalty-card-e37c9.firebaseapp.com",
      "https://asiduo.club",
    ],
    runtime: "nodejs22",
  },
  async (req, res) => {
    // Configurar CORS
    const corsHandler = cors({
      origin: [
        "http://localhost:5173",
        "https://virtual-loyalty-card-e37c9.web.app",
        "https://virtual-loyalty-card-e37c9.firebaseapp.com",
        "https://asiduo.club",
      ],
      credentials: true,
    });

    return new Promise((resolve) => {
      corsHandler(req, res, async () => {
        try {
          // Verificar autenticación
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "Token de autenticación requerido" });
            resolve();
            return;
          }

          const token = authHeader.split("Bearer ")[1];
          let decodedToken;

          try {
            decodedToken = await admin.auth().verifyIdToken(token);
          } catch (error) {
            res.status(401).json({ error: "Token inválido" });
            resolve();
            return;
          }

          // Verificar permisos (admin o propietario del negocio)
          const userDoc = await admin
            .firestore()
            .collection("users")
            .doc(decodedToken.uid)
            .get();

          if (!userDoc.exists) {
            res.status(403).json({ error: "Usuario no encontrado" });
            resolve();
            return;
          }

          const userData = userDoc.data();
          const isAdmin = userData.role === "admin";

          // Enrutar según método HTTP
          switch (req.method) {
            case "GET":
              await handleGetConfig(req, res, userData, isAdmin);
              break;
            case "POST":
              await handleSaveConfig(req, res, userData, isAdmin);
              break;
            case "PUT":
              await handleUpdateConfig(req, res, userData, isAdmin);
              break;
            case "DELETE":
              await handleDeleteConfig(req, res, userData, isAdmin);
              break;
            default:
              res.status(405).json({ error: "Método no permitido" });
          }
        } catch (error) {
          console.error("❌ Error en extractionConfigAPI:", error);
          res.status(500).json({
            error: "Error interno del servidor",
            details: error.message,
          });
        }
        resolve();
      });
    });
  }
);

/**
 * Maneja peticiones GET para obtener configuraciones
 */
async function handleGetConfig(req, res, userData, isAdmin) {
  const { businessSlug, action } = req.query;

  try {
    switch (action) {
      case "all":
        if (!isAdmin) {
          res.status(403).json({ error: "Permisos insuficientes" });
          return;
        }
        const allConfigs =
          await businessConfigService.getAllExtractionConfigs();
        res.json({ configs: allConfigs });
        break;

      case "stats":
        if (!businessSlug) {
          res.status(400).json({ error: "businessSlug requerido" });
          return;
        }

        // Verificar permisos para el negocio específico
        if (
          !isAdmin &&
          !(await hasBusinessAccess(userData.uid, businessSlug))
        ) {
          res.status(403).json({ error: "Sin acceso a este negocio" });
          return;
        }

        const stats = await businessConfigService.getConfigStats(businessSlug);
        res.json({ stats });
        break;

      case "generate":
        if (!businessSlug) {
          res.status(400).json({ error: "businessSlug requerido" });
          return;
        }

        if (
          !isAdmin &&
          !(await hasBusinessAccess(userData.uid, businessSlug))
        ) {
          res.status(403).json({ error: "Sin acceso a este negocio" });
          return;
        }

        const autoConfig = await businessConfigService.generateAutoConfig(
          businessSlug
        );
        res.json({
          config: autoConfig,
          message: autoConfig
            ? "Configuración generada automáticamente"
            : "No hay suficientes datos para generar configuración",
        });
        break;

      default:
        // Obtener configuración específica
        if (!businessSlug) {
          res.status(400).json({ error: "businessSlug requerido" });
          return;
        }

        if (
          !isAdmin &&
          !(await hasBusinessAccess(userData.uid, businessSlug))
        ) {
          res.status(403).json({ error: "Sin acceso a este negocio" });
          return;
        }

        const config = await businessConfigService.getExtractionConfig(
          businessSlug
        );
        res.json({
          config,
          hasConfig: !!config,
        });
    }
  } catch (error) {
    console.error("❌ Error en handleGetConfig:", error);
    res.status(500).json({ error: "Error obteniendo configuración" });
  }
}

/**
 * Maneja peticiones POST para crear nuevas configuraciones
 */
async function handleSaveConfig(req, res, userData, isAdmin) {
  const { businessSlug, config, testText } = req.body;

  if (!businessSlug || !config) {
    res.status(400).json({ error: "businessSlug y config son requeridos" });
    return;
  }

  // Verificar permisos
  if (!isAdmin && !(await hasBusinessAccess(userData.uid, businessSlug))) {
    res.status(403).json({ error: "Sin acceso a este negocio" });
    return;
  }

  try {
    // Si se proporciona texto de prueba, probar la configuración primero
    let testResult = null;
    if (testText) {
      testResult = businessConfigService.testConfig(config, testText);
      if (!testResult.success) {
        res.status(400).json({
          error: "La configuración no funciona correctamente",
          details: testResult.error,
          testResult,
        });
        return;
      }
    }

    // Guardar configuración
    const success = await businessConfigService.saveExtractionConfig(
      businessSlug,
      config
    );

    if (success) {
      res.json({
        message: "Configuración guardada exitosamente",
        testResult,
        confidence: testResult?.confidence || null,
      });
    } else {
      res.status(500).json({ error: "Error guardando configuración" });
    }
  } catch (error) {
    console.error("❌ Error en handleSaveConfig:", error);
    res.status(500).json({ error: "Error guardando configuración" });
  }
}

/**
 * Maneja peticiones PUT para actualizar configuraciones existentes
 */
async function handleUpdateConfig(req, res, userData, isAdmin) {
  // Reutilizar lógica de POST ya que es la misma operación en Firestore
  await handleSaveConfig(req, res, userData, isAdmin);
}

/**
 * Maneja peticiones DELETE para eliminar configuraciones
 */
async function handleDeleteConfig(req, res, userData, isAdmin) {
  const { businessSlug } = req.query;

  if (!businessSlug) {
    res.status(400).json({ error: "businessSlug requerido" });
    return;
  }

  // Verificar permisos
  if (!isAdmin && !(await hasBusinessAccess(userData.uid, businessSlug))) {
    res.status(403).json({ error: "Sin acceso a este negocio" });
    return;
  }

  try {
    // Eliminar configuración estableciendo el campo como null
    await admin.firestore().collection("businesses").doc(businessSlug).update({
      extractionConfig: admin.firestore.FieldValue.delete(),
      extractionConfigUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Limpiar cache
    businessConfigService.clearCachedConfig(businessSlug);

    res.json({ message: "Configuración eliminada exitosamente" });
  } catch (error) {
    console.error("❌ Error en handleDeleteConfig:", error);
    res.status(500).json({ error: "Error eliminando configuración" });
  }
}

/**
 * Verifica si un usuario tiene acceso a un negocio específico
 * @param {string} userId - ID del usuario
 * @param {string} businessSlug - Slug del negocio
 * @returns {Promise<boolean>} - true si tiene acceso
 */
async function hasBusinessAccess(userId, businessSlug) {
  try {
    // Verificar si el usuario es propietario del negocio
    const businessDoc = await admin
      .firestore()
      .collection("businesses")
      .doc(businessSlug)
      .get();

    if (!businessDoc.exists) {
      return false;
    }

    const businessData = businessDoc.data();

    // Verificar diferentes formas de ownership
    return (
      businessData.ownerId === userId ||
      businessData.adminIds?.includes(userId) ||
      businessData.managersIds?.includes(userId)
    );
  } catch (error) {
    console.error("❌ Error verificando acceso al negocio:", error);
    return false;
  }
}

module.exports = {
  extractionConfigAPI,
};
