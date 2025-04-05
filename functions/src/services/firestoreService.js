// functions/src/services/firestoreService.js
const admin = require('firebase-admin');

// Usar la instancia de Firestore desde el index.js principal
// No inicializar Firebase aquí para evitar el error de múltiples inicializaciones
let db;

// Función para establecer la referencia a Firestore desde el index.js principal
function setFirestoreDb(firestoreDb) {
  db = firestoreDb;
}

/**
 * Verifica si un recibo ya ha sido registrado previamente
 * @param {string} businessSlug - Slug del negocio
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {number} amount - Monto de la compra
 * @param {string} imageUrl - URL de la imagen del recibo
 * @param {object} invoiceData - Datos adicionales de la factura
 * @returns {Promise<boolean>} - True si es un recibo duplicado, false en caso contrario
 */
async function isDuplicateReceipt(businessSlug, phoneNumber, amount, imageUrl, invoiceData = {}) {
  try {
    // Normalizar el número de teléfono para asegurar consistencia
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    // Crear un identificador único basado en la combinación de negocio, cliente y monto
    // Esto ayuda a detectar duplicados incluso si se envía la misma imagen varias veces
    const uniqueId = `${businessSlug}-${normalizedPhone}-${amount}`;
    
    // Si tenemos RUC e invoiceNumber, usarlos para una identificación más precisa
    if (invoiceData.ruc && invoiceData.invoiceNumber) {
      const invoiceRef = db.collection("invoices")
        .where("ruc", "==", invoiceData.ruc)
        .where("invoiceNumber", "==", invoiceData.invoiceNumber)
        .limit(1);
      
      const invoiceSnapshot = await invoiceRef.get();
      if (!invoiceSnapshot.empty) {
        console.log(`Factura duplicada detectada: RUC ${invoiceData.ruc}, Número ${invoiceData.invoiceNumber}`);
        return true;
      }
    }
    
    // Verificar si ya existe una compra con características similares en las últimas 24 horas
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const purchasesRef = db.collection("business_purchases")
      .where("businessSlug", "==", businessSlug)
      .where("customerPhone", "==", normalizedPhone)
      .where("amount", "==", amount)
      .where("timestamp", ">=", oneDayAgo);
    
    const purchasesSnapshot = await purchasesRef.get();
    
    if (!purchasesSnapshot.empty) {
      console.log(`Compra duplicada detectada para ${normalizedPhone} en ${businessSlug} por ${amount}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error verificando duplicados:", error);
    // En caso de error, asumimos que no es duplicado para no penalizar al usuario
    return false;
  }
}

/**
 * Busca o crea un cliente basado en su número de teléfono
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {string} name - Nombre del cliente
 * @returns {Promise<object>} - Datos del cliente
 */
async function findOrCreateCustomer(phoneNumber, name) {
  try {
    // Normalizar el número de teléfono para asegurar consistencia
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    // Buscar el cliente por número de teléfono
    const customerRef = db.collection("customers").doc(normalizedPhone);
    const customerDoc = await customerRef.get();
    
    if (customerDoc.exists) {
      // Si el cliente existe, retornar sus datos
      const customerData = customerDoc.data();
      return {
        phone: normalizedPhone,
        ...customerData
      };
    }
    
    // Si el cliente no existe, crear un nuevo registro
    const newCustomer = {
      displayName: name || "Cliente",
      phone: normalizedPhone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      businesses: {},
      totalPurchases: 0
    };
    
    // Guardar el nuevo cliente
    await customerRef.set(newCustomer);
    
    return newCustomer;
  } catch (error) {
    console.error("Error buscando/creando cliente:", error);
    throw error;
  }
}

/**
 * Registra una compra en el sistema
 * @param {string} businessSlug - Slug del negocio
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {number} amount - Monto de la compra
 * @param {string} imageUrl - URL de la imagen del recibo
 * @param {object} additionalData - Datos adicionales de la compra
 * @returns {Promise<object>} - Resultado del registro
 */
async function registerPurchase(businessSlug, phoneNumber, amount, imageUrl, additionalData = {}) {
  try {
    console.log(`Registrando compra para ${phoneNumber} en ${businessSlug} por ${amount}`);
    
    // Obtener información del usuario para business_customers
    let userId = null;
    let customerName = additionalData.customerName || "Cliente";
    
    // Normalizar el número de teléfono
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    // Referencia al documento del cliente
    const customerRef = db.collection("customers").doc(normalizedPhone);
    const customerDoc = await customerRef.get();
    
    // Datos del cliente (existente o nuevo)
    let customerData = {};
    
    if (customerDoc.exists) {
      customerData = customerDoc.data();
      customerName = customerData.displayName || customerName;
    } else {
      // Crear nuevo cliente si no existe
      customerData = {
        displayName: customerName,
        phone: normalizedPhone,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        businesses: {},
        totalPurchases: 0
      };
    }
    
    // Inicializar datos del negocio si no existen
    if (!customerData.businesses) {
      customerData.businesses = {};
    }
    
    if (!customerData.businesses[businessSlug]) {
      customerData.businesses[businessSlug] = {
        purchases: 0,
        purchaseCount: 0, // Campo requerido por el componente LoyaltyCard
        points: 0,
        totalSpent: 0,
        lastPurchase: null,
        purchaseHistory: [],
        // Array de compras para compatibilidad con el componente LoyaltyCard
        purchases: []
      };
    }
    
    // Si no existe purchaseHistory, inicializarla
    if (!customerData.businesses[businessSlug].purchaseHistory) {
      customerData.businesses[businessSlug].purchaseHistory = [];
    }
    
    // Si no existe el array de purchases, inicializarlo
    if (!Array.isArray(customerData.businesses[businessSlug].purchases)) {
      customerData.businesses[businessSlug].purchases = [];
    }
    
    // Crear registro de compra con timestamp
    const purchaseRecord = {
      amount: parseFloat(amount),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      date: admin.firestore.FieldValue.serverTimestamp(), // Para compatibilidad con el componente LoyaltyCard
      invoiceNumber: additionalData.invoiceNumber || null,
      ruc: additionalData.ruc || null,
      address: additionalData.address || null,
      businessName: additionalData.businessName || null
    };
    
    // Añadir la compra actual al historial
    customerData.businesses[businessSlug].purchaseHistory.push(purchaseRecord);
    
    // Añadir la compra al array de purchases para el componente LoyaltyCard
    customerData.businesses[businessSlug].purchases.push(purchaseRecord);
    
    // Actualizar datos del cliente
    customerData.totalPurchases = (customerData.totalPurchases || 0) + 1;
    // Incrementar el contador numérico de compras
    customerData.businesses[businessSlug].purchaseCount = (customerData.businesses[businessSlug].purchaseCount || 0) + 1;
    customerData.businesses[businessSlug].lastPurchase = admin.firestore.FieldValue.serverTimestamp();
    
    // Calcular puntos (1 punto por cada 10 soles)
    const pointsToAdd = Math.floor(amount / 10);
    customerData.businesses[businessSlug].points = (customerData.businesses[businessSlug].points || 0) + pointsToAdd;
    
    // Calcular total gastado
    const previousTotal = customerData.businesses[businessSlug].totalSpent || 0;
    const totalSpent = previousTotal + amount;
    customerData.businesses[businessSlug].totalSpent = isNaN(totalSpent) ? 0 : totalSpent;
    
    console.log(`Total gastado calculado para ${phoneNumber} en ${businessSlug}: ${customerData.businesses[businessSlug].totalSpent}`);
    
    // Actualizar o crear documento del cliente
    await customerRef.set(customerData);
    
    // Crear un registro en la colección invoices para evitar duplicados
    const invoiceData = {
      businessSlug,
      customerPhone: normalizedPhone,
      amount,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      imageUrl,
      ruc: additionalData.ruc || null,
      invoiceNumber: additionalData.invoiceNumber || null,
      amountInWords: additionalData.amountInWords || null
    };
    
    // Si tenemos RUC y número de factura, usarlos como ID
    let invoiceId = null;
    if (additionalData.ruc && additionalData.invoiceNumber) {
      invoiceId = `${additionalData.ruc}-${additionalData.invoiceNumber}`;
    } else {
      // Generar un ID único basado en negocio, cliente y timestamp
      invoiceId = `${businessSlug}-${normalizedPhone}-${Date.now()}`;
    }
    
    await db.collection("invoices").doc(invoiceId).set(invoiceData);
    
    // Crear un registro en business_purchases
    try {
      if (businessSlug) {
        // Crear un ID personalizado usando RUC + número de factura si están disponibles
        let purchaseId = null;
        if (additionalData.ruc && additionalData.invoiceNumber) {
          purchaseId = `${additionalData.ruc}-${additionalData.invoiceNumber}`;
        } else {
          // Generar un ID único basado en negocio, cliente y timestamp
          purchaseId = `${businessSlug}-${normalizedPhone}-${Date.now()}`;
        }
        
        const purchaseData = {
          businessSlug,
          customerPhone: normalizedPhone,
          customerName,
          amount,
          pointsEarned: pointsToAdd,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          imageUrl,
          address: additionalData.address || null,
          ruc: additionalData.ruc || null,
          invoiceNumber: additionalData.invoiceNumber || null,
          businessName: additionalData.businessName || null,
          ...additionalData
        };
        
        console.log("Registrando en business_purchases:", purchaseId);
        await db.collection("business_purchases").doc(purchaseId).set(purchaseData);
        
        // Registrar en business_customers
        const businessCustomerId = `${businessSlug}-${normalizedPhone}`;
        const businessCustomerRef = db.collection("business_customers").doc(businessCustomerId);
        const businessCustomerDoc = await businessCustomerRef.get();
        
        let businessCustomerData = {};
        
        if (businessCustomerDoc.exists) {
          businessCustomerData = businessCustomerDoc.data();
        } else {
          businessCustomerData = {
            businessSlug,
            customerPhone: normalizedPhone,
            customerName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            purchases: 0,
            totalSpent: 0,
            points: 0,
            purchaseHistory: []
          };
        }
        
        // Actualizar datos
        businessCustomerData.purchases = (businessCustomerData.purchases || 0) + 1;
        businessCustomerData.totalSpent = (businessCustomerData.totalSpent || 0) + amount;
        businessCustomerData.points = (businessCustomerData.points || 0) + pointsToAdd;
        businessCustomerData.lastPurchase = admin.firestore.FieldValue.serverTimestamp();
        
        // Si no existe purchaseHistory, inicializarla
        if (!businessCustomerData.purchaseHistory) {
          businessCustomerData.purchaseHistory = [];
        }
        
        // Añadir la compra actual al historial
        businessCustomerData.purchaseHistory.push({
          purchaseId,
          amount: parseFloat(amount),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          date: admin.firestore.FieldValue.serverTimestamp(), // Para compatibilidad con el componente LoyaltyCard
          invoiceNumber: additionalData.invoiceNumber || null
        });
        
        console.log("Registrando en business_customers:", businessCustomerId);
        await businessCustomerRef.set(businessCustomerData);
      }
    } catch (error) {
      console.error("Error registrando en business_purchases o business_customers:", error);
      // Continuamos aunque falle este registro
    }
    
    return {
      success: true,
      customer: {
        phone: normalizedPhone,
        name: customerName,
        points: customerData.businesses[businessSlug].points,
        purchases: customerData.businesses[businessSlug].purchases,
        totalSpent: customerData.businesses[businessSlug].totalSpent
      },
      pointsAdded: pointsToAdd,
      businessSlug
    };
  } catch (error) {
    console.error("Error registrando compra:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene la información de puntos de un cliente
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @returns {Promise<object>} - Información de puntos del cliente
 */
async function getCustomerPointsInfo(phoneNumber) {
  try {
    // Normalizar el número de teléfono
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    // Obtener documento del cliente
    const customerRef = db.collection("customers").doc(normalizedPhone);
    const customerDoc = await customerRef.get();
    
    if (!customerDoc.exists) {
      return {
        success: false,
        message: "Cliente no encontrado"
      };
    }
    
    const customerData = customerDoc.data();
    const businesses = customerData.businesses || {};
    
    // Formatear la información de puntos por negocio
    const businessPoints = [];
    
    for (const [slug, data] of Object.entries(businesses)) {
      // Obtener información del negocio
      let businessName = slug;
      try {
        const businessDoc = await db.collection("businesses").doc(slug).get();
        if (businessDoc.exists) {
          businessName = businessDoc.data().name || slug;
        }
      } catch (error) {
        console.error(`Error obteniendo info del negocio ${slug}:`, error);
      }
      
      businessPoints.push({
        slug,
        name: businessName,
        points: data.points || 0,
        purchases: data.purchases || 0,
        totalSpent: data.totalSpent || 0
      });
    }
    
    // Ordenar por cantidad de puntos (mayor a menor)
    businessPoints.sort((a, b) => b.points - a.points);
    
    return {
      success: true,
      customer: {
        name: customerData.displayName || "Cliente",
        phone: normalizedPhone,
        totalPurchases: customerData.totalPurchases || 0
      },
      businesses: businessPoints
    };
  } catch (error) {
    console.error("Error obteniendo información de puntos:", error);
    return {
      success: false,
      message: "Error obteniendo información de puntos"
    };
  }
}

/**
 * Busca un negocio por su RUC
 * @param {string} ruc - RUC del negocio
 * @returns {Promise<object|null>} - Datos del negocio o null si no existe
 */
async function findBusinessByRUC(ruc) {
  try {
    if (!ruc) return null;
    
    const businessRef = db.collection("businesses")
      .where("ruc", "==", ruc)
      .limit(1);
    
    const snapshot = await businessRef.get();
    
    if (snapshot.empty) {
      console.log(`No se encontró negocio con RUC: ${ruc}`);
      return null;
    }
    
    const businessData = snapshot.docs[0].data();
    return {
      id: snapshot.docs[0].id,
      ...businessData
    };
  } catch (error) {
    console.error("Error buscando negocio por RUC:", error);
    return null;
  }
}

module.exports = {
  setFirestoreDb,
  isDuplicateReceipt,
  findOrCreateCustomer,
  registerPurchase,
  getCustomerPointsInfo,
  findBusinessByRUC
};
