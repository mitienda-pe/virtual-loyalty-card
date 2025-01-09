import functions from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import twilio from "twilio";

// Inicializar Firebase Admin
initializeApp();

// Inicializar Vision API client con autenticación por defecto
const visionClient = new ImageAnnotatorClient();

// Inicializar Firestore
const db = getFirestore();

// Función auxiliar para extraer el importe del texto
const extractAmount = (text) => {
  // Buscar patrones comunes de importes en tickets peruanos
  const patterns = [
    /Total a Pagar S\/[\s]*:[\s]*([0-9]+\.[0-9]{2})/i,
    /Importe Total S\/[\s]*:[\s]*([0-9]+\.[0-9]{2})/i,
    /Total[\s:]*S\/[\s]*([0-9]+\.[0-9]{2})/i,
    /S\/[\s]*([0-9]+\.[0-9]{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(",", "."));
    }
  }
  return null;
};

// Verificar si un ticket es duplicado
const isDuplicateReceipt = async (db, phoneNumber, amount, imageUrl) => {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - 24);

  const snapshot = await db
    .collection("purchases")
    .where("phoneNumber", "==", phoneNumber)
    .where("date", ">", Timestamp.fromDate(cutoffTime))
    .get();

  return snapshot.docs.some((doc) => {
    const purchase = doc.data();
    return (
      Math.abs(purchase.amount - amount) < 0.01 ||
      purchase.receiptUrl === imageUrl
    );
  });
};

// Validar tiempo entre compras
const validateTimeBetweenPurchases = async (db, phoneNumber) => {
  const minTimeBetweenPurchases = 30 * 60 * 1000; // 30 minutos

  const lastPurchase = await db
    .collection("purchases")
    .where("phoneNumber", "==", phoneNumber)
    .orderBy("date", "desc")
    .limit(1)
    .get();

  if (!lastPurchase.empty) {
    const lastPurchaseTime = lastPurchase.docs[0].data().date.toDate();
    const timeElapsed = Date.now() - lastPurchaseTime.getTime();

    if (timeElapsed < minTimeBetweenPurchases) {
      const minutesRemaining = Math.ceil(
        (minTimeBetweenPurchases - timeElapsed) / 60000
      );
      return {
        valid: false,
        message: `Por favor espera ${minutesRemaining} minutos antes de registrar otra compra.`,
      };
    }
  }

  return { valid: true };
};

// Función principal que procesa los mensajes de WhatsApp
export const processWhatsAppMessage = functions.https.onRequest(
  async (req, res) => {
    try {
      const { From, NumMedia } = req.body;
      const phoneNumber = From.replace("whatsapp:", "");
      const messagingResponse = new twilio.twiml.MessagingResponse();

      // Si no hay imágenes adjuntas
      if (NumMedia === "0") {
        messagingResponse.message(
          "Por favor, envía una foto de tu ticket de compra."
        );
        res.set("Content-Type", "text/xml");
        return res.send(messagingResponse.toString());
      }

      // Validar tiempo entre compras
      const timeValidation = await validateTimeBetweenPurchases(
        db,
        phoneNumber
      );
      if (!timeValidation.valid) {
        messagingResponse.message(timeValidation.message);
        res.set("Content-Type", "text/xml");
        return res.send(messagingResponse.toString());
      }

      // Procesar la imagen con Vision API
      const imageUrl = req.body["MediaUrl0"];
      const [result] = await visionClient.textDetection(imageUrl);

      if (!result.fullTextAnnotation) {
        messagingResponse.message(
          "No se pudo detectar texto en la imagen. Por favor, intenta con otra foto."
        );
        res.set("Content-Type", "text/xml");
        return res.send(messagingResponse.toString());
      }

      const detectedText = result.fullTextAnnotation.text;
      const amount = extractAmount(detectedText);

      if (!amount) {
        messagingResponse.message(
          "No se pudo identificar el importe en el ticket. Por favor, intenta con otra foto."
        );
        res.set("Content-Type", "text/xml");
        return res.send(messagingResponse.toString());
      }

      // Verificar duplicados
      const isDuplicate = await isDuplicateReceipt(
        db,
        phoneNumber,
        amount,
        imageUrl
      );
      if (isDuplicate) {
        messagingResponse.message(
          "Este ticket parece haber sido registrado anteriormente. Por favor, envía un ticket diferente."
        );
        res.set("Content-Type", "text/xml");
        return res.send(messagingResponse.toString());
      }

      // Guardar la compra en Firestore
      const purchase = {
        phoneNumber,
        amount,
        date: Timestamp.now(),
        receiptUrl: imageUrl,
        verified: true,
      };

      await db.collection("purchases").add(purchase);

      // Obtener el total de compras para este número
      const purchasesQuery = await db
        .collection("purchases")
        .where("phoneNumber", "==", phoneNumber)
        .get();

      const purchaseCount = purchasesQuery.size;
      const remainingPurchases = 10 - purchaseCount;

      // Enviar respuesta apropiada
      let responseMessage;
      if (remainingPurchases > 0) {
        responseMessage =
          `¡Compra registrada! Te faltan ${remainingPurchases} ${
            remainingPurchases === 1 ? "compra" : "compras"
          } para completar tu tarjeta. Puedes ver tu tarjeta en: ` +
          `https://virtual-loyalty-card-e37c9.firebaseapp.com/card/${phoneNumber}`;
      } else {
        responseMessage =
          "¡Felicidades! Has completado tu tarjeta de fidelización. " +
          "Muestra este mensaje en el establecimiento para reclamar tu premio.";
      }

      messagingResponse.message(responseMessage);
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
  }
);
