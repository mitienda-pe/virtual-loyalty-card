// functions/src/config.js
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Inicializar Firebase Admin solo si no hay apps inicializadas
const app = getApps().length === 0 ? initializeApp() : getApps()[0];
const db = getFirestore(app);

export { app, db };
