// functions/src/mercadopago.js
import { onRequest } from "firebase-functions/v2/https";
import { MercadoPagoConfig, Preference } from "mercadopago";

export const createPref = onRequest(
  {
    cors: [
      "http://localhost:5173",
      "https://virtual-loyalty-card-e37c9.web.app",
      "https://virtual-loyalty-card-e37c9.firebaseapp.com",
    ],
  },
  async (req, res) => {
    try {
      console.log("🚀 Iniciando función createPreference");
      console.log("📨 Request body:", JSON.stringify(req.body, null, 2));
      console.log(
        "🔑 Access token configurado:",
        !!process.env.MERCADOPAGO_ACCESS_TOKEN
      );

      // Configurar cliente
      const client = new MercadoPagoConfig({
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      });

      // Comprobar que tenemos todos los datos necesarios
      const { planClients, total, businessName, ruc } = req.body;

      console.log("🔍 Datos recibidos:", {
        planClients,
        total,
        businessName,
        ruc,
        accessTokenLength: process.env.MERCADOPAGO_ACCESS_TOKEN?.length,
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

// src/services/mercadopago.js
export const loadMercadoPagoScript = () => {
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
