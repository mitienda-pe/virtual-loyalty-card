// functions/src/mercadopago.js
import { onRequest } from "firebase-functions/v2/https";
import mercadopago from "mercadopago";

// Configurar SDK de MercadoPago
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

export const createPreference = onRequest(async (request, response) => {
  try {
    const { orderData } = request.body;

    // Crear la preferencia de pago
    const preference = {
      items: [
        {
          title: `Plan Anual - ${orderData.planClients} clientes`,
          unit_price: orderData.total,
          quantity: 1,
          currency_id: "PEN",
        },
      ],
      payer: {
        name: orderData.businessName,
        identification: {
          type: "RUC",
          number: orderData.ruc,
        },
        address: {
          street_name: orderData.address,
        },
      },
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
        installments: 1,
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/checkout/success`,
        failure: `${process.env.FRONTEND_URL}/checkout/failure`,
        pending: `${process.env.FRONTEND_URL}/checkout/pending`,
      },
      auto_return: "approved",
      notification_url: `${process.env.FUNCTIONS_URL}/mercadopago-webhook`,
    };

    const result = await mercadopago.preferences.create(preference);
    response.json(result.body);
  } catch (error) {
    console.error("Error creating preference:", error);
    response.status(500).json({ error: error.message });
  }
});

export const webhook = onRequest(async (request, response) => {
  try {
    const { type, data } = request.body;

    if (type === "payment") {
      const payment = await mercadopago.payment.findById(data.id);
      const { status, external_reference } = payment.body;

      // Actualizar el estado del pago en Firestore
      const subscriptionRef = db
        .collection("subscriptions")
        .doc(external_reference);
      await subscriptionRef.update({
        "payment.status": status,
        "payment.data": payment.body,
        "payment.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    response.send();
  } catch (error) {
    console.error("Error processing webhook:", error);
    response.status(500).send(error);
  }
});
