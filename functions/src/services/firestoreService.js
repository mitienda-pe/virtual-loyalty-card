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
    if (!phoneNumber) {
      console.error('Error: Número de teléfono no proporcionado en isDuplicateReceipt');
      return false; // No podemos verificar duplicados sin número de teléfono
    }
    
    // Normalizar el número de teléfono para asegurar consistencia
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    // Si tenemos RUC e invoiceNumber, usarlos para una identificación más precisa
    if (invoiceData.ruc && invoiceData.invoiceNumber) {
      // Verificar en la colección de compras del negocio
      const purchasesRef = db.collection('business_purchases')
        .doc(businessSlug)
        .collection('purchases')
        .where("ruc", "==", invoiceData.ruc)
        .where("invoiceNumber", "==", invoiceData.invoiceNumber)
        .limit(1);
      
      const purchasesSnapshot = await purchasesRef.get();
      if (!purchasesSnapshot.empty) {
        console.log(`Factura duplicada detectada: RUC ${invoiceData.ruc}, Número ${invoiceData.invoiceNumber}`);
        return true;
      }
    }
    
    // Verificar si ya existe una compra con características similares en las últimas 24 horas
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const purchasesRef = db.collection('business_purchases')
      .doc(businessSlug)
      .collection('purchases')
      .where("phoneNumber", "==", normalizedPhone)
      .where("amount", "==", parseFloat(amount))
      .where("date", ">", oneDayAgo)
      .limit(1);
    
    const purchasesSnapshot = await purchasesRef.get();
    if (!purchasesSnapshot.empty) {
      console.log(`Compra duplicada detectada para ${businessSlug} - ${normalizedPhone} - ${amount}`);
      return true;
    }
    
    // Si llegamos aquí, no es un duplicado
    return false;
  } catch (error) {
    console.error("Error verificando duplicados:", error);
    // En caso de error, asumimos que no es duplicado para evitar bloquear compras legítimas
    return false;
  }
}

/**
 * Busca o crea un cliente basado en su número de teléfono
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {string} name - Nombre del cliente
 * @returns {Promise<object>} - Datos del cliente
 */
async function findOrCreateCustomer(phoneNumber, name = null) {
  try {
    // Normalizar el número de teléfono para asegurar consistencia
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    // Buscar el cliente en Firestore
    const customerRef = db.collection("customers").doc(normalizedPhone);
    const customerDoc = await customerRef.get();
    
    if (customerDoc.exists) {
      // Cliente existente
      const customerData = customerDoc.data();
      
      // Actualizar el nombre si se proporciona uno nuevo y es diferente
      if (name && (!customerData.profile?.name || name !== customerData.profile.name)) {
        // Asegurarse de que existe el objeto profile
        if (!customerData.profile) {
          customerData.profile = {};
        }
        
        // Actualizar solo el campo name dentro de profile
        await customerRef.update({ 
          'profile.name': name,
          'profile.lastActive': admin.firestore.FieldValue.serverTimestamp()
        });
        
        customerData.profile.name = name;
        customerData.profile.lastActive = admin.firestore.FieldValue.serverTimestamp();
      } else {
        // Actualizar solo lastActive
        await customerRef.update({ 
          'profile.lastActive': admin.firestore.FieldValue.serverTimestamp() 
        });
      }
      
      return customerData;
    } else {
      // Nuevo cliente
      const newCustomer = {
        profile: {
          phoneNumber: normalizedPhone,
          name: name || "Cliente", // Nombre por defecto si no se proporciona
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActive: admin.firestore.FieldValue.serverTimestamp()
        },
        businesses: {}
      };
      
      await customerRef.set(newCustomer);
      return newCustomer;
    }
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
    if (!phoneNumber) {
      console.error('Error: Número de teléfono no proporcionado en registerPurchase');
      throw new Error('Número de teléfono requerido para registrar compra');
    }
    
    if (!businessSlug) {
      console.error('Error: Business slug no proporcionado en registerPurchase');
      throw new Error('Business slug requerido para registrar compra');
    }
    
    console.log(`Registrando compra para ${phoneNumber} en ${businessSlug} por ${amount}`);
    
    // Normalizar el número de teléfono para asegurar consistencia
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    // Obtener nombre del cliente
    let customerName = additionalData.customerName || "Cliente";
    
    // 1. Actualizar colección customers
    // Referencia al documento del cliente
    const customerRef = db.collection("customers").doc(normalizedPhone);
    const customerDoc = await customerRef.get();
    
    // Datos del cliente (existente o nuevo)
    let customerData = {};
    
    if (customerDoc.exists) {
      customerData = customerDoc.data();
      // Usar el nombre del perfil si existe
      if (customerData.profile && customerData.profile.name) {
        customerName = customerData.profile.name;
      }
    } else {
      // Crear nuevo cliente si no existe
      customerData = {
        profile: {
          phoneNumber: normalizedPhone,
          name: customerName,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActive: admin.firestore.FieldValue.serverTimestamp()
        },
        businesses: {}
      };
    }
    
    // Inicializar datos del negocio si no existen
    if (!customerData.businesses) {
      customerData.businesses = {};
    }
    
    if (!customerData.businesses[businessSlug]) {
      customerData.businesses[businessSlug] = {
        firstVisit: admin.firestore.FieldValue.serverTimestamp(),
        lastVisit: admin.firestore.FieldValue.serverTimestamp(),
        purchaseCount: 0,
        totalSpent: 0,
        purchases: []
      };
    }
    
    // Si no existe el array de purchases, inicializarlo
    if (!Array.isArray(customerData.businesses[businessSlug].purchases)) {
      customerData.businesses[businessSlug].purchases = [];
    }
    
    // Crear registro de compra con timestamp
    const purchaseRecord = {
      amount: parseFloat(amount),
      date: admin.firestore.FieldValue.serverTimestamp(),
      receiptUrl: imageUrl,
      verified: true,
      invoiceNumber: additionalData.invoiceNumber || null,
      ruc: additionalData.ruc || null,
      address: additionalData.address || null,
      businessName: additionalData.businessName || null
    };
    
    // Añadir la compra al array de purchases
    customerData.businesses[businessSlug].purchases.push(purchaseRecord);
    
    // Actualizar datos del cliente
    customerData.businesses[businessSlug].purchaseCount = (customerData.businesses[businessSlug].purchaseCount || 0) + 1;
    customerData.businesses[businessSlug].lastVisit = admin.firestore.FieldValue.serverTimestamp();
    
    // Calcular total gastado
    const previousTotal = customerData.businesses[businessSlug].totalSpent || 0;
    const totalSpent = previousTotal + parseFloat(amount);
    customerData.businesses[businessSlug].totalSpent = isNaN(totalSpent) ? 0 : totalSpent;
    
    console.log(`Total gastado calculado para ${phoneNumber} en ${businessSlug}: ${customerData.businesses[businessSlug].totalSpent}`);
    
    // Actualizar o crear documento del cliente
    await customerRef.set(customerData, { merge: true });
    
    // 3. Registrar la factura en la colección 'invoices'
    const invoiceId = `${businessSlug}_${normalizedPhone}_${Date.now()}`;
    const invoiceRef = db.collection('invoices').doc(invoiceId);
    await invoiceRef.set({
      businessSlug: businessSlug,
      phoneNumber: normalizedPhone,
      amount: parseFloat(amount),
      date: admin.firestore.FieldValue.serverTimestamp(),
      receiptUrl: imageUrl,
      verified: true,
      invoiceNumber: additionalData.invoiceNumber || null,
      ruc: additionalData.ruc || null,
      address: additionalData.address || null,
      businessName: additionalData.businessName || null
    });
    
    // 2. Actualizar colección business_customers
    try {
      // Referencia al documento del cliente en business_customers
      const businessCustomersRef = db.collection('business_customers')
        .doc(businessSlug)
        .collection('customers')
        .doc(normalizedPhone);
      
      const businessCustomerDoc = await businessCustomersRef.get();
      
      let businessCustomerData = {};
      
      if (businessCustomerDoc.exists) {
        businessCustomerData = businessCustomerDoc.data();
        // Actualizar datos existentes
        businessCustomerData.lastVisit = admin.firestore.FieldValue.serverTimestamp();
        businessCustomerData.purchaseCount = (businessCustomerData.purchaseCount || 0) + 1;
        businessCustomerData.totalSpent = (businessCustomerData.totalSpent || 0) + parseFloat(amount);
      } else {
        // Crear nuevo registro
        businessCustomerData = {
          phoneNumber: normalizedPhone,
          name: customerName,
          firstVisit: admin.firestore.FieldValue.serverTimestamp(),
          lastVisit: admin.firestore.FieldValue.serverTimestamp(),
          purchaseCount: 1,
          totalSpent: parseFloat(amount)
        };
      }
      
      console.log("Registrando en business_customers:", `${businessSlug}/customers/${normalizedPhone}`);
      await businessCustomersRef.set(businessCustomerData, { merge: true });
      
      // 3. Registrar en business_purchases
      // Crear un ID personalizado usando RUC + número de factura si están disponibles
      let purchaseId = null;
      if (additionalData.ruc && additionalData.invoiceNumber) {
        purchaseId = `${additionalData.ruc}-${additionalData.invoiceNumber}`;
      } else {
        // Generar un ID único basado en timestamp o usar el generado por Firestore
        purchaseId = db.collection('business_purchases').doc(businessSlug).collection('purchases').doc().id;
      }
      
      const businessPurchasesRef = db.collection('business_purchases')
        .doc(businessSlug)
        .collection('purchases')
        .doc(purchaseId);
      
      const purchaseData = {
        id: purchaseId,
        phoneNumber: normalizedPhone,
        customerName: customerName,
        date: admin.firestore.FieldValue.serverTimestamp(),
        amount: parseFloat(amount),
        // Solo incluir receiptUrl si existe
        ...(imageUrl ? { receiptUrl: imageUrl } : { receiptUrl: null }),
        verified: additionalData.verified || false,
        ...additionalData
      };
      
      console.log("Registrando en business_purchases:", `${businessSlug}/purchases/${purchaseId}`);
      await businessPurchasesRef.set(purchaseData);
      
      // 4. Actualizar ruc_business_map si tenemos RUC
      if (additionalData.ruc) {
        const rucMapRef = db.collection('ruc_business_map').doc(additionalData.ruc);
        await rucMapRef.set({ businessSlug }, { merge: true });
      }
    } catch (error) {
      console.error("Error registrando en colecciones secundarias:", error);
      // Continuamos aunque falle este registro secundario
    }
    
    return {
      success: true,
      customer: {
        phone: normalizedPhone,
        name: customerName,
        purchaseCount: customerData.businesses[businessSlug].purchaseCount,
        purchases: customerData.businesses[businessSlug].purchases,
        totalSpent: customerData.businesses[businessSlug].totalSpent
      },
      business: {
        slug: businessSlug
      },
      purchase: {
        amount: parseFloat(amount),
        receiptUrl: imageUrl
      }
    };
  } catch (error) {
    console.error("Error registrando compra:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene la información de puntos de un cliente
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {string} [businessSlug] - Slug del negocio (opcional) para filtrar los resultados
 * @returns {Promise<object>} - Información de puntos del cliente
 */
async function getCustomerPointsInfo(phoneNumber, businessSlug = null) {
  try {
    if (!phoneNumber) {
      console.error('Error: Número de teléfono no proporcionado en getCustomerPointsInfo');
      return {
        success: false,
        message: "Número de teléfono requerido para obtener información de puntos"
      };
    }
    
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
    
    // Si se proporciona un businessSlug, solo incluir ese negocio
    if (businessSlug) {
      console.log(`Filtrando información de puntos para el negocio: ${businessSlug}`);
      
      // Verificar si el cliente tiene datos para este negocio
      if (businesses[businessSlug]) {
        const data = businesses[businessSlug];
        let businessName = businessSlug;
        
        try {
          const businessDoc = await db.collection("businesses").doc(businessSlug).get();
          if (businessDoc.exists) {
            businessName = businessDoc.data().name || businessSlug;
          }
        } catch (error) {
          console.error(`Error obteniendo info del negocio ${businessSlug}:`, error);
        }
        
        businessPoints.push({
          slug: businessSlug,
          name: businessName,
          points: data.points || 0,
          purchases: data.purchases || 0,
          totalSpent: data.totalSpent || 0
        });
      } else {
        console.log(`El cliente no tiene datos para el negocio: ${businessSlug}`);
      }
    } else {
      // Si no se proporciona un businessSlug, incluir todos los negocios
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
    if (!ruc) {
      console.log("RUC no proporcionado para búsqueda de negocio");
      return null;
    }
    
    // Primero buscar en el mapa de RUC a business slug
    const rucMapRef = db.collection("ruc_business_map").doc(ruc);
    const rucMapDoc = await rucMapRef.get();
    
    let businessSlug = null;
    
    if (rucMapDoc.exists) {
      // Si existe en el mapa, obtener el slug
      businessSlug = rucMapDoc.data().businessSlug;
      console.log(`Negocio encontrado en ruc_business_map: ${businessSlug}`);
    } else {
      // Si no existe en el mapa, buscar en la colección de negocios
      const businessesRef = db.collection("businesses").where("ruc", "==", ruc).limit(1);
      const snapshot = await businessesRef.get();
      
      if (snapshot.empty) {
        console.log(`No se encontró negocio con RUC: ${ruc}`);
        return null;
      }
      
      // Obtener el slug y guardar en el mapa para futuras búsquedas
      businessSlug = snapshot.docs[0].id;
      await rucMapRef.set({ businessSlug });
      console.log(`Negocio encontrado en businesses y guardado en mapa: ${businessSlug}`);
    }
    
    // Ahora obtener los datos completos del negocio
    const businessRef = db.collection("businesses").doc(businessSlug);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      console.log(`Negocio con slug ${businessSlug} no encontrado`);
      return null;
    }
    
    const businessData = businessDoc.data();
    
    return {
      id: businessSlug,
      slug: businessSlug,
      ...businessData
    };
  } catch (error) {
    console.error("Error buscando negocio por RUC:", error);
    return null;
  }
}

/**
 * Migrates existing business data to the ruc_business_map collection.
 * This function reads all businesses from the 'businesses' collection
 * and creates a mapping in the 'ruc_business_map' collection for each RUC.
 */
async function migrateRucBusinessMap() {
  try {
    const businessesRef = db.collection('businesses');
    const businessesSnapshot = await businessesRef.get();

    if (businessesSnapshot.empty) {
      console.log('No businesses found to migrate.');
      return;
    }

    const batch = db.batch();

    businessesSnapshot.forEach(doc => {
      const businessData = doc.data();
      const ruc = businessData.ruc;
      const businessSlug = doc.id; // Use the document ID as the business slug

      if (ruc) {
        const rucMapRef = db.collection('ruc_business_map').doc(ruc);
        batch.set(rucMapRef, { businessSlug: businessSlug });
      } else {
        console.warn(`Business ${businessSlug} has no RUC. Skipping.`);
      }
    });

    await batch.commit();
    console.log('RUC to business slug mapping migration completed.');

  } catch (error) {
    console.error('Error migrating RUC to business slug mapping:', error);
  }
}

module.exports = {
  setFirestoreDb,
  isDuplicateReceipt,
  findOrCreateCustomer,
  registerPurchase,
  getCustomerPointsInfo,
  findBusinessByRUC,
  migrateRucBusinessMap
};
