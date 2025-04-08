// functions/src/mercadopago.js
const { onRequest } = require("firebase-functions/v2/https");
const { MercadoPagoConfig, Preference } = require("mercadopago");

// Función simplificada para obtener el token de Mercado Pago
function getMercadoPagoToken() {
  // Acceder directamente a la variable de entorno proporcionada por el secreto
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (token) {
    console.log("🔑 Token de Mercado Pago obtenido desde secreto");
    return token;
  }

  // Fallback para desarrollo o si no se encuentra el secreto
  console.log("💡 Usando token de prueba");
  return "TEST-5274008335450404-031316-d1d2c8e7a5a6a4f5c1b2d1d2c8e7a5a6-1234567";
}

const createPref = onRequest(
  {
    cors: [
      "http://localhost:5173",
      "https://virtual-loyalty-card-e37c9.web.app",
      "https://virtual-loyalty-card-e37c9.firebaseapp.com",
      "https://asiduo.club",
    ],
    // Agregar variables de entorno explícitamente
    environmentVariables: {
      MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN || ""
    },
  },
  async (req, res) => {
    try {
      console.log("🚀 Iniciando función createPreference");
      console.log("📨 Request body:", JSON.stringify(req.body, null, 2));

      // Obtener el token de acceso
      const accessToken = getMercadoPagoToken();
      console.log("🔑 Access token obtenido:", !!accessToken);

      // Configurar cliente
      const client = new MercadoPagoConfig({
        accessToken: accessToken,
      });

      // Comprobar que tenemos todos los datos necesarios
      const { planClients, total, businessName, ruc } = req.body;

      console.log("🔍 Datos recibidos:", {
        planClients,
        total,
        businessName,
        ruc,
        accessTokenLength: accessToken?.length,
      });

      // Crear datos de preferencia según documentación
      const preferenceData = {
        items: [
          {
            title: "Plan Anual Loyalty Card",
            quantity: 1,
            currency_id: "PEN",
            unit_price: Number(total),
          },
        ],
      };

      console.log(
        "📋 Datos de preferencia:",
        JSON.stringify(preferenceData, null, 2)
      );

      // Crear preferencia
      const preference = new Preference(client);
      console.log("🔄 Creando preferencia...");

      const response = await preference.create({ body: preferenceData });
      console.log(
        "✅ Respuesta de MercadoPago:",
        JSON.stringify(response, null, 2)
      );

      res.json(response);
    } catch (error) {
      console.error("❌ Error completo:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        details: error.details,
        status: error.status,
        cause: error.cause,
      });

      // Verificar la configuración
      console.log("🔧 Verificación de configuración:", {
        hasAccessToken: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
        accessTokenStart: process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(
          0,
          10
        ),
        nodeEnv: process.env.NODE_ENV,
      });

      res.status(500).json({
        error: error.message,
        details: "Error al crear la preferencia",
        cause: error.cause,
        status: error.status,
      });
    }
  }
);

// Esta función es para el frontend, no se usa en las funciones de Firebase
const loadMercadoPagoScript = () => {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) {
      console.log("🔄 MercadoPago ya está cargado");
      resolve(window.MercadoPago);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.type = "text/javascript";
    script.async = true;

    script.onload = () => {
      console.log("✅ SDK de MercadoPago cargado correctamente");
      resolve(window.MercadoPago);
    };

    script.onerror = () => {
      console.error("❌ Error al cargar SDK de MercadoPago");
      reject(new Error("Error al cargar MercadoPago SDK"));
    };

    document.body.appendChild(script);
  });
};

module.exports = {
  createPref,
  getMercadoPagoToken,
};
