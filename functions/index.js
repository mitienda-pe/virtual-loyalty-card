// functions/index.js
import { onRequest } from "firebase-functions/v2/https";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import twilio from "twilio";
import express from "express";
import cors from "cors";
import { app as firebaseApp, db } from "./src/config.js";
import { createPref } from "./src/mercadopago.js";

// Inicializar Vision API client
const visionClient = new ImageAnnotatorClient();

// Crear app Express para WhatsApp
const expressApp = express();

// Middleware para WhatsApp
expressApp.use(cors({ origin: true }));
expressApp.use(express.urlencoded({ extended: true }));
expressApp.use(express.json());

// Función auxiliar para extraer RUC e importe del texto
const extractRUCAndAmount = (text) => {
  // Patrones comunes para RUC en facturas peruanas
  const rucPatterns = [/R\.U\.C\.[\s:]*([0-9]{11})/i, /RUC[\s:]*([0-9]{11})/i];

  // Patrones para montos
  const amountPatterns = [
    /Total a Pagar S\/[\s]*:[\s]*([0-9]+\.[0-9]{2})/i,
    /Importe Total S\/[\s]*:[\s]*([0-9]+\.[0-9]{2})/i,
    /Total[\s:]*S\/[\s]*([0-9]+\.[0-9]{2})/i,
    /S\/[\s]*([0-9]+\.[0-9]{2})/,
  ];

  let ruc = null;
  let amount = null;

  // Buscar RUC
  for (const pattern of rucPatterns) {
    const match = text.match(pattern);
    if (match) {
      ruc = match[1];
      break;
    }
  }

  // Buscar monto
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(",", "."));
      break;
    }
  }

  return { ruc, amount };
};

// Función para verificar si un ticket es duplicado
const isDuplicateReceipt = async (
  businessSlug,
  phoneNumber,
  amount,
  imageUrl
) => {
  const customerRef = db.collection("customers").doc(phoneNumber);
  const customerDoc = await customerRef.get();

  if (!customerDoc.exists) {
    return false;
  }

  const customerData = customerDoc.data();
  const businessPurchases =
    customerData.businesses?.[businessSlug]?.purchases || [];

  return businessPurchases.some(
    (purchase) =>
      Math.abs(purchase.amount - amount) < 0.01 ||
      purchase.receiptUrl === imageUrl
  );
};

// Función para validar tiempo entre compras
const validateTimeBetweenPurchases = async (
  businessSlug,
  phoneNumber,
  timeLimit
) => {
  const customerRef = db.collection("customers").doc(phoneNumber);
  const customerDoc = await customerRef.get();

  if (!customerDoc.exists) {
    return { valid: true };
  }

  const customerData = customerDoc.data();
  const businessData = customerData.businesses?.[businessSlug];

  if (!businessData?.lastVisit) {
    return { valid: true };
  }

  const lastVisitTime = businessData.lastVisit.toDate();
  const timeElapsed = Date.now() - lastVisitTime.getTime();

  if (timeElapsed < timeLimit) {
    const minutesRemaining = Math.ceil((timeLimit - timeElapsed) / 60000);
    return {
      valid: false,
      message: `Por favor espera ${minutesRemaining} minutos antes de registrar otra compra.`,
    };
  }

  return { valid: true };
};

// Manejar mensajes de WhatsApp
expressApp.post("/", async (req, res) => {
  try {
    const { From, NumMedia } = req.body;
    const phoneNumber = From.replace("whatsapp:", "");
    const messagingResponse = new twilio.twiml.MessagingResponse();

    // [... resto de la lógica del processWhatsAppMessage ...]

    // Por ahora, solo enviar una respuesta simple
    messagingResponse.message(
      "Recibimos tu mensaje. Estamos procesando tu ticket."
    );
    res.set("Content-Type", "text/xml");
    res.send(messagingResponse.toString());
  } catch (error) {
    console.error("Error:", error);
    const messagingResponse = new twilio.twiml.MessagingResponse();
    messagingResponse.message(
      "Lo siento, ha ocurrido un error al procesar tu ticket. Por favor, intenta de nuevo."
    );
    res.set("Content-Type", "text/xml");
    res.send(messagingResponse.toString());
  }
});

export const createPreference = createPref;
export const processWhatsAppMessage = onRequest(expressApp);
