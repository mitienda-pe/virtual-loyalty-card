// seed/index.js
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  writeBatch,
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

// Datos de los negocios
const businesses = [
  {
    slug: "la-baguette",
    name: "La Baguette",
    ruc: "20504680623",
    address: "Av. Alfredo Benavides 1944, Miraflores",
    phone: "+51999309748",
    logo: "/logos/la-baguette.jpg",
    cover: "/covers/la-baguette.jpg",
    config: {
      purchasesRequired: 10,
      timeLimit: 1800000, // 30 minutos
      reward: "1 café americano gratis",
    },
  },
  {
    slug: "la-parisien",
    name: "La Parisien",
    ruc: "20565498976",
    address: "Av. La Molina 1167, La Molina",
    phone: "+51999309748",
    logo: "/logos/la-parisien.jpg",
    cover: "/covers/la-parisien.jpg",
    config: {
      purchasesRequired: 8,
      timeLimit: 1800000, // 30 minutos
      reward: "1 croissant gratis",
    },
  },
];

// Datos de clientes de prueba
const customers = [
  {
    phoneNumber: "+51999309748",
    name: "Carlos",
  },
  {
    phoneNumber: "+51987654321",
    name: "María",
  },
  {
    phoneNumber: "+51923456789",
    name: "Juan",
  },
];

// Función para generar una fecha aleatoria en los últimos 30 días
const randomDate = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
};

// Función para generar un monto aleatorio entre 10 y 50 soles
const randomAmount = () => Math.floor(Math.random() * 40 + 10);

// Función para generar compras aleatorias para un cliente en un negocio
const generatePurchases = (count) => {
  const purchases = [];
  for (let i = 0; i < count; i++) {
    purchases.push({
      date: randomDate(),
      amount: randomAmount(),
      receiptUrl: `https://storage.googleapis.com/virtual-loyalty-card-e37c9.appspot.com/receipts/receipt-${
        i + 1
      }.jpg`,
      verified: true,
    });
  }
  return purchases.sort((a, b) => a.date.getTime() - b.date.getTime());
};

// Función principal para poblar datos
const seedData = async () => {
  try {
    console.log("Iniciando población de datos...");

    // 1. Crear negocios
    console.log("Creando negocios...");
    for (const business of businesses) {
      await setDoc(doc(db, "businesses", business.slug), {
        ...business,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Negocio creado: ${business.name}`);
    }

    // 2. Crear clientes y sus compras
    console.log("Creando clientes y compras...");
    const batch = writeBatch(db);

    for (const customer of customers) {
      // Generar compras aleatorias para cada negocio
      for (const business of businesses) {
        const purchaseCount = Math.floor(Math.random() * 12); // 0-11 compras
        const purchases = generatePurchases(purchaseCount);

        if (purchases.length > 0) {
          // Actualizar documento del cliente
          const customerRef = doc(db, "customers", customer.phoneNumber);
          batch.set(
            customerRef,
            {
              profile: {
                phoneNumber: customer.phoneNumber,
                name: customer.name,
                createdAt: purchases[0].date,
                lastActive: purchases[purchases.length - 1].date,
              },
              businesses: {
                [business.slug]: {
                  firstVisit: purchases[0].date,
                  lastVisit: purchases[purchases.length - 1].date,
                  purchaseCount: purchases.length,
                  totalSpent: purchases.reduce((sum, p) => sum + p.amount, 0),
                  purchases,
                },
              },
            },
            { merge: true }
          );

          // Crear documento en business_customers
          const businessCustomerRef = doc(
            db,
            "business_customers",
            business.slug,
            "customers",
            customer.phoneNumber
          );
          batch.set(businessCustomerRef, {
            phoneNumber: customer.phoneNumber,
            name: customer.name,
            firstVisit: purchases[0].date,
            lastVisit: purchases[purchases.length - 1].date,
            purchaseCount: purchases.length,
            totalSpent: purchases.reduce((sum, p) => sum + p.amount, 0),
          });

          // Crear documentos en business_purchases
          purchases.forEach((purchase, index) => {
            const purchaseId = `${customer.phoneNumber}-${business.slug}-${
              index + 1
            }`;
            const purchaseRef = doc(
              db,
              "business_purchases",
              business.slug,
              "purchases",
              purchaseId
            );
            batch.set(purchaseRef, {
              ...purchase,
              phoneNumber: customer.phoneNumber,
              customerName: customer.name,
            });
          });
        }
      }
    }

    // Commit todos los cambios
    await batch.commit();
    console.log("Datos de prueba creados exitosamente");
    process.exit(0);
  } catch (error) {
    console.error("Error al poblar datos:", error);
    process.exit(1);
  }
};

// Ejecutar la población de datos
seedData();
