// scripts/update-image-urls.js
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// URL base correcta para Firebase Storage
const STORAGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/virtual-loyalty-card-e37c9.firebasestorage.app/o";

// Función para actualizar las URLs
const updateImageUrls = async () => {
  try {
    console.log("Iniciando actualización de URLs...");

    const businessesSnapshot = await getDocs(collection(db, "businesses"));

    for (const businessDoc of businessesSnapshot.docs) {
      const businessData = businessDoc.data();
      const slug = businessDoc.id;

      // Construir nuevas URLs con el formato correcto
      // Nota: Mantenemos ?alt=media sin el token ya que Firebase lo generará automáticamente
      const newUrls = {
        logo: `${STORAGE_URL}/logos%2F${slug}.png?alt=media`,
        cover: `${STORAGE_URL}/covers%2F${slug}-cover.jpg?alt=media`,
      };

      // Actualizar documento
      await updateDoc(doc(db, "businesses", slug), newUrls);

      console.log(`URLs actualizadas para ${businessData.name} (${slug})`);
      console.log("Logo:", newUrls.logo);
      console.log("Cover:", newUrls.cover);
      console.log("---");
    }

    console.log("Actualización completada exitosamente");
    process.exit(0);
  } catch (error) {
    console.error("Error en la actualización:", error);
    process.exit(1);
  }
};

// Ejecutar actualización
updateImageUrls();
