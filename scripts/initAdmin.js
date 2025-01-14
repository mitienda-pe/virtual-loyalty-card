// scripts/initAdmin.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Configurar dotenv para leer el archivo .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función para crear el super-admin
async function createSuperAdmin() {
  try {
    const userRef = doc(db, "users", "ZaIb7OtwnmbwU8SQIo2C2pCPafQ2");

    await setDoc(userRef, {
      email: "carlos@mitienda.pe",
      role: "super-admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Super-admin creado exitosamente");
    process.exit(0);
  } catch (error) {
    console.error("Error al crear super-admin:", error);
    process.exit(1);
  }
}

// Ejecutar la función
createSuperAdmin();
