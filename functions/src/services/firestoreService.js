// functions/src/services/firestoreService.js
const admin = require("firebase-admin");

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
async function isDuplicateReceipt(
  businessSlug,
  phoneNumber,
  amount,
  imageUrl,
  invoiceData = {}
) {
  try {
    if (!phoneNumber) {
      console.error(
        "Error: Número de teléfono no proporcionado en isDuplicateReceipt"
      );
      return false; // No podemos verificar duplicados sin número de teléfono
    }

    // Normalizar el número de teléfono para asegurar consistencia
    const normalizedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+${phoneNumber}`;

    // Si tenemos RUC e invoiceNumber, usarlos para una identificación más precisa
    if (invoiceData.ruc && invoiceData.invoiceNumber) {
      // Verificar en la colección de compras del negocio
      const purchasesRef = db
        .collection("business_invoices")
        .doc(businessSlug)
        .collection("purchases")
        .where("ruc", "==", invoiceData.ruc)
        .where("invoiceNumber", "==", invoiceData.invoiceNumber)
        .limit(1);

      const purchasesSnapshot = await purchasesRef.get();
      if (!purchasesSnapshot.empty) {
        console.log(
          `Factura duplicada detectada: RUC ${invoiceData.ruc}, Número ${invoiceData.invoiceNumber}`
        );
        return true;
      }
    }

    // Verificar si ya existe una compra con características similares en las últimas 24 horas
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    try {
      // Intentar usar la consulta que requiere un índice compuesto
      const purchasesRef = db
        .collection("business_invoices")
        .doc(businessSlug)
        .collection("purchases")
        .where("phoneNumber", "==", normalizedPhone)
        .where("amount", "==", parseFloat(amount))
        .where("date", ">", oneDayAgo)
        .limit(1);

      const purchasesSnapshot = await purchasesRef.get();
      if (!purchasesSnapshot.empty) {
        console.log(
          `Compra duplicada detectada para ${businessSlug} - ${normalizedPhone} - ${amount}`
        );
        return true;
      }
    } catch (indexError) {
      // Si hay un error de índice faltante, usar una estrategia alternativa
      if (
        indexError.message &&
        indexError.message.includes("FAILED_PRECONDITION") &&
        indexError.message.includes("index")
      ) {
        console.log(
          "Índice compuesto no disponible, usando verificación alternativa"
        );

        // Estrategia alternativa: obtener todas las compras del usuario y filtrar manualmente
        try {
          const simpleRef = db
            .collection("business_invoices")
            .doc(businessSlug)
            .collection("purchases")
            .where("phoneNumber", "==", normalizedPhone)
            .limit(20); // Limitar a las últimas 20 compras para evitar problemas de rendimiento

          const simpleSnapshot = await simpleRef.get();

          // Verificar manualmente si hay alguna compra con monto similar en las últimas 24 horas
          const duplicateFound = simpleSnapshot.docs.some((doc) => {
            const data = doc.data();
            const date =
              data.date && data.date.toDate ? data.date.toDate() : null;
            return (
              data.amount === parseFloat(amount) && date && date > oneDayAgo
            );
          });

          if (duplicateFound) {
            console.log(
              `Compra duplicada detectada (verificación alternativa) para ${businessSlug} - ${normalizedPhone} - ${amount}`
            );
            return true;
          }
        } catch (alternativeError) {
          console.error(
            "Error en verificación alternativa de duplicados:",
            alternativeError
          );
        }
      } else {
        // Si es otro tipo de error, registrarlo
        console.error(
          "Error en verificación de duplicados (índice):",
          indexError
        );
      }
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
    const normalizedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+${phoneNumber}`;

    // Buscar el cliente en Firestore
    const customerRef = db.collection("customers").doc(normalizedPhone);
    const customerDoc = await customerRef.get();

    if (customerDoc.exists) {
      // Cliente existente
      const customerData = customerDoc.data();

      // Actualizar el nombre si se proporciona uno nuevo y es diferente
      if (
        name &&
        (!customerData.profile?.name || name !== customerData.profile.name)
      ) {
        // Asegurarse de que existe el objeto profile
        if (!customerData.profile) {
          customerData.profile = {};
        }

        // Actualizar solo el campo name dentro de profile
        await customerRef.update({
          "profile.name": name,
          "profile.lastActive": admin.firestore.FieldValue.serverTimestamp(),
        });

        customerData.profile.name = name;
        customerData.profile.lastActive =
          admin.firestore.FieldValue.serverTimestamp();
      } else {
        // Actualizar solo lastActive
        await customerRef.update({
          "profile.lastActive": admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Asegurarse de que el objeto tenga la propiedad phone para compatibilidad
      customerData.phone = normalizedPhone;
      customerData.phoneNumber = normalizedPhone;
      return customerData;
    } else {
      // Nuevo cliente
      const newCustomer = {
        profile: {
          phoneNumber: normalizedPhone,
          name: name || "Cliente", // Nombre por defecto si no se proporciona
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActive: admin.firestore.FieldValue.serverTimestamp(),
        },
        businesses: {},
      };

      await customerRef.set(newCustomer);
      // Asegurarse de que el objeto tenga la propiedad phone para compatibilidad
      newCustomer.phone = normalizedPhone;
      newCustomer.phoneNumber = normalizedPhone;
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
async function registerPurchase(
  businessSlug,
  phoneNumber,
  amount,
  imageUrl,
  additionalData = {}
) {
  console.log(
    `💾 INICIO registerPurchase: businessSlug=${businessSlug}, phoneNumber=${phoneNumber}, amount=${amount}`
  );
  console.log(`Datos adicionales: ${JSON.stringify(additionalData)}`);

  if (!phoneNumber) {
    console.error(
      "Error: Número de teléfono no proporcionado en registerPurchase"
    );
    throw new Error("Número de teléfono requerido para registrar compra");
  }

  if (!businessSlug) {
    console.error("Error: Business slug no proporcionado en registerPurchase");
    throw new Error("Business slug requerido para registrar compra");
  }

  // Validar que el número de comprobante (invoiceNumber) sea obligatorio
  if (
    !additionalData.invoiceNumber ||
    typeof additionalData.invoiceNumber !== "string" ||
    additionalData.invoiceNumber.trim() === ""
  ) {
    console.error(
      "Error: Número de comprobante (invoiceNumber) no proporcionado o vacío en registerPurchase"
    );
    throw new Error(
      "El número de comprobante (invoiceNumber) es obligatorio para registrar la compra."
    );
  }

  // Validar que el monto sea un número válido
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    console.error(`Error: Monto inválido en registerPurchase: ${amount}`);
    throw new Error(`Monto inválido para registrar compra: ${amount}`);
  }

  console.log(
    `Registrando compra para ${phoneNumber} en ${businessSlug} por ${amount}`
  );

  // Normalizar el número de teléfono para asegurar consistencia
  const normalizedPhone = phoneNumber.startsWith("+")
    ? phoneNumber
    : `+${phoneNumber}`;

  // Obtener nombre del cliente
  let customerName = additionalData.customerName || "Cliente";

  // Obtener configuración del negocio
  let config = {};
  try {
    const businessRef = db.collection("businesses").doc(businessSlug);
    const businessDoc = await businessRef.get();
    if (businessDoc.exists && businessDoc.data().config) {
      config = businessDoc.data().config;
    }
  } catch (err) {
    console.error('No se pudo obtener configuración del negocio:', err);
  }

  // Validar minAmount (si está definido)
  if (config.minAmount && parseFloat(amount) < config.minAmount) {
    console.log(`Compra menor al minAmount (${config.minAmount}), no se registra consumo.`);
    return { success: false, message: `El monto mínimo para registrar un consumo es ${config.minAmount}` };
  }

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
        lastActive: admin.firestore.FieldValue.serverTimestamp(),
      },
      businesses: {},
    };
  }

  // Inicializar datos del negocio si no existen
  if (!customerData.businesses) {
    customerData.businesses = {};
  }

  if (!customerData.businesses[businessSlug]) {
    // Usamos Date() en lugar de serverTimestamp() para evitar problemas con arrays
    const currentDate = new Date();
    customerData.businesses[businessSlug] = {
      firstVisit: currentDate,
      lastVisit: currentDate,
      purchaseCount: 0,
      totalSpent: 0,
      purchases: [],
    };
  }

  // Si no existe el array de purchases, inicializarlo
  if (!Array.isArray(customerData.businesses[businessSlug].purchases)) {
    customerData.businesses[businessSlug].purchases = [];
  }

  // Crear registro de compra con timestamp
  // Nota: No podemos usar serverTimestamp() dentro de arrays en Firestore
  // así que usamos una fecha JavaScript normal
  const purchaseRecord = {
    amount: parseFloat(amount),
    date: new Date(), // Usar Date() en lugar de serverTimestamp() para arrays
    receiptUrl: imageUrl,
    verified: true,
    invoiceNumber: additionalData.invoiceNumber || null,
    ruc: additionalData.ruc || null,
    address: additionalData.address || null,
    businessName: additionalData.businessName || null,
  };

  console.log(`Registro de compra creado con fecha: ${purchaseRecord.date}`);

  // Añadir la compra al array de purchases
  customerData.businesses[businessSlug].purchases.push(purchaseRecord);

  // Actualizar datos del cliente
  customerData.businesses[businessSlug].purchaseCount =
    (customerData.businesses[businessSlug].purchaseCount || 0) + 1;
  // Usamos Date() para lastVisit en lugar de serverTimestamp() para evitar problemas
  // cuando se actualiza el documento que contiene el array de purchases
  customerData.businesses[businessSlug].lastVisit = new Date();

  // Calcular total gastado
  const previousTotal = customerData.businesses[businessSlug].totalSpent || 0;
  const totalSpent = previousTotal + parseFloat(amount);
  customerData.businesses[businessSlug].totalSpent = isNaN(totalSpent)
    ? 0
    : totalSpent;

  // Buscar si hay premio escalonado para este número de consumos
  let escalatedReward = null;
  if (Array.isArray(config.rewards)) {
    const match = config.rewards.find(r => r.consumptions == customerData.businesses[businessSlug].purchaseCount);
    if (match) {
      escalatedReward = match.reward;
      console.log(`¡Premio escalonado alcanzado!: ${escalatedReward}`);
    }
  }

  console.log(
    `Total gastado calculado para ${phoneNumber} en ${businessSlug}: ${customerData.businesses[businessSlug].totalSpent}`
  );

  // Actualizar o crear documento del cliente
  console.log(`Actualizando documento del cliente: ${normalizedPhone}`);
  console.log(
    `Datos a guardar: ${JSON.stringify(customerData.businesses[businessSlug])}`
  );
  await customerRef.set(customerData, { merge: true });
  console.log(
    `✅ Documento del cliente actualizado exitosamente: ${normalizedPhone}`
  );

  // 3. Registrar la factura en la colección 'invoices'
  const invoiceId = `${businessSlug}_${normalizedPhone}_${Date.now()}`;
  console.log(`Registrando factura con ID: ${invoiceId}`);
  const invoiceRef = db.collection("invoices").doc(invoiceId);
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
    businessName: additionalData.businessName || null,
  });

  // 2. Actualizar colección business_customers
  try {
    // Referencia al documento del cliente en business_customers
    const businessCustomersRef = db
      .collection("business_customers")
      .doc(businessSlug)
      .collection("customers")
      .doc(normalizedPhone);

    const businessCustomerDoc = await businessCustomersRef.get();

    let businessCustomerData = {};

    if (businessCustomerDoc.exists) {
      businessCustomerData = businessCustomerDoc.data();
      // Actualizar datos existentes
      businessCustomerData.lastVisit =
        admin.firestore.FieldValue.serverTimestamp();
      businessCustomerData.purchaseCount =
        (businessCustomerData.purchaseCount || 0) + 1;
      businessCustomerData.totalSpent =
        (businessCustomerData.totalSpent || 0) + parseFloat(amount);
    } else {
      // Crear nuevo registro
      businessCustomerData = {
        phoneNumber: normalizedPhone,
        name: customerName,
        firstVisit: admin.firestore.FieldValue.serverTimestamp(),
        lastVisit: admin.firestore.FieldValue.serverTimestamp(),
        purchaseCount: 1,
        totalSpent: parseFloat(amount),
      };
    }

    console.log(
      "Registrando en business_customers:",
      `${businessSlug}/customers/${normalizedPhone}`
    );
    try {
      await businessCustomersRef.set(businessCustomerData, { merge: true });
      console.log(
        "✅ Cliente registrado en business_customers:",
        `${businessSlug}/customers/${normalizedPhone}`
      );
    } catch (err) {
      console.error("❌ Error registrando en business_customers:", err);
    }

    // 3. Registrar en business_invoices
    // Crear un ID personalizado usando RUC + número de factura si están disponibles
    let purchaseId = null;
    if (additionalData.ruc && additionalData.invoiceNumber) {
      purchaseId = `${additionalData.ruc}-${additionalData.invoiceNumber}`;
    } else {
      // Generar un ID único basado en timestamp o usar el generado por Firestore
      purchaseId = db
        .collection("business_invoices")
        .doc(businessSlug)
        .collection("purchases")
        .doc().id;
    }

    const businessPurchasesRef = db
      .collection("business_invoices")
      .doc(businessSlug)
      .collection("purchases")
      .doc(purchaseId);

    let purchaseData = {
      extractedText: additionalData.extractedText || null,
      id: purchaseId,
      phoneNumber: normalizedPhone,
      customerName: customerName,
      date: admin.firestore.FieldValue.serverTimestamp(),
      amount: parseFloat(amount),
      ...(imageUrl ? { receiptUrl: imageUrl } : { receiptUrl: null }),
      verified: additionalData.verified || false,
      invoiceNumber: additionalData.invoiceNumber || null,
      ruc: additionalData.ruc || null,
      address: additionalData.address || null,
      businessName: additionalData.businessName || null,
      ...Object.fromEntries(
        Object.entries(additionalData).filter(
          ([key]) =>
            ![
              "invoiceNumber",
              "ruc",
              "address",
              "businessName",
              "verified",
            ].includes(key)
        )
      ),
    };
    // Limpiar campos undefined
    purchaseData = Object.fromEntries(
      Object.entries(purchaseData).filter(([_, v]) => v !== undefined)
    );
    console.log(
      "🟦 purchaseData FINAL a guardar en business_invoices:",
      JSON.stringify(purchaseData)
    );

    console.log(
      "Registrando en business_invoices:",
      `${businessSlug}/purchases/${purchaseId}`
    );
    try {
      await businessPurchasesRef.set(purchaseData);
      console.log(
        "✅ Compra registrada en business_invoices:",
        `${businessSlug}/purchases/${purchaseId}`
      );
    } catch (err) {
      console.error(
        "❌ Error registrando en business_invoices:",
        err,
        JSON.stringify(purchaseData)
      );
    }

    // 4. Actualizar ruc_business_map si tenemos RUC
    if (additionalData.ruc) {
      const rucMapRef = db
        .collection("ruc_business_map")
        .doc(additionalData.ruc);
      await rucMapRef.set({ businessSlug }, { merge: true });
    }
  } catch (error) {
    console.error("Error registrando en colecciones secundarias:", error);
    // Continuamos aunque falle este registro secundario
  }

  const result = {
    success: true,
    customer: {
      phone: normalizedPhone,
      name: customerName,
      purchaseCount: customerData.businesses[businessSlug].purchaseCount,
      purchases: customerData.businesses[businessSlug].purchases,
      totalSpent: customerData.businesses[businessSlug].totalSpent,
    },
    business: {
      slug: businessSlug,
    },
    purchase: {
      amount: parseFloat(amount),
      date: new Date(),
      invoiceId: invoiceId,
    },
    reward: escalatedReward || null,
  };

  console.log(
    `💾 FIN registerPurchase: Compra registrada exitosamente para ${normalizedPhone} en ${businessSlug}`
  );
  return result;
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
      console.error(
        "Error: Número de teléfono no proporcionado en getCustomerPointsInfo"
      );
      return {
        success: false,
        message:
          "Número de teléfono requerido para obtener información de puntos",
      };
    }

    // Normalizar el número de teléfono
    const normalizedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+${phoneNumber}`;

    // Obtener documento del cliente
    const customerRef = db.collection("customers").doc(normalizedPhone);
    const customerDoc = await customerRef.get();

    if (!customerDoc.exists) {
      return {
        success: false,
        message: "Cliente no encontrado",
      };
    }

    const customerData = customerDoc.data();
    const businesses = customerData.businesses || {};

    // Formatear la información de puntos por negocio
    const businessPoints = [];

    // Si se proporciona un businessSlug, solo incluir ese negocio
    if (businessSlug) {
      console.log(
        `Filtrando información de puntos para el negocio: ${businessSlug}`
      );

      // Verificar si el cliente tiene datos para este negocio
      if (businesses[businessSlug]) {
        const data = businesses[businessSlug];
        let businessName = businessSlug;

        try {
          const businessDoc = await db
            .collection("businesses")
            .doc(businessSlug)
            .get();
          if (businessDoc.exists) {
            businessName = businessDoc.data().name || businessSlug;
          }
        } catch (error) {
          console.error(
            `Error obteniendo info del negocio ${businessSlug}:`,
            error
          );
        }

        businessPoints.push({
          slug: businessSlug,
          name: businessName,
          points: data.points || 0,
          purchases: data.purchases || 0,
          totalSpent: data.totalSpent || 0,
        });
      } else {
        console.log(
          `El cliente no tiene datos para el negocio: ${businessSlug}`
        );
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
          totalSpent: data.totalSpent || 0,
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
        totalPurchases: customerData.totalPurchases || 0,
      },
      businesses: businessPoints,
    };
  } catch (error) {
    console.error("Error obteniendo información de puntos:", error);
    return {
      success: false,
      message: "Error obteniendo información de puntos",
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
      const businessesRef = db
        .collection("businesses")
        .where("ruc", "==", ruc)
        .limit(1);
      const snapshot = await businessesRef.get();

      if (snapshot.empty) {
        console.log(`No se encontró negocio con RUC: ${ruc}`);
        return null;
      }

      // Obtener el slug y guardar en el mapa para futuras búsquedas
      businessSlug = snapshot.docs[0].id;
      await rucMapRef.set({ businessSlug });
      console.log(
        `Negocio encontrado en businesses y guardado en mapa: ${businessSlug}`
      );
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
      ...businessData,
    };
  } catch (error) {
    console.error("Error buscando negocio por RUC:", error);
    return null;
  }
}

/**
 * Redime una recompensa para un cliente, usando consumos FIFO y registrando la redención
 * @param {string} businessSlug - Slug del negocio
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {object} redemptionData - Datos de la redención: { reward, approvedBy, consumptionsNeeded, customerName }
 * @returns {Promise<object>} - Resultado de la redención
 */
async function redeemReward(businessSlug, phoneNumber, redemptionData = {}) {
  if (!db) throw new Error('Firestore DB not initialized');
  if (!businessSlug || !phoneNumber || !redemptionData.reward) {
    throw new Error('Parámetros requeridos faltantes para redención');
  }
  const normalizedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
  const customerRef = db.collection("customers").doc(normalizedPhone);
  const redemptionsRef = db.collection("business_redemptions").doc(businessSlug).collection("redemptions");

  return await db.runTransaction(async (t) => {
    const customerDoc = await t.get(customerRef);
    if (!customerDoc.exists) throw new Error('Cliente no encontrado');
    const customerData = customerDoc.data();
    const businessData = customerData.businesses?.[businessSlug];
    if (!businessData || !Array.isArray(businessData.purchases)) {
      throw new Error('No hay consumos registrados para este negocio');
    }
    const consumptionsNeeded = redemptionData.consumptionsNeeded || 10;
    // Buscar consumos no usados (FIFO)
    const purchases = businessData.purchases;
    const unusedIndexes = [];
    for (let i = 0; i < purchases.length; i++) {
      if (!purchases[i].usedForRedemption) unusedIndexes.push(i);
      if (unusedIndexes.length === consumptionsNeeded) break;
    }
    if (unusedIndexes.length < consumptionsNeeded) {
      throw new Error('No hay suficientes consumos para redimir la recompensa');
    }
    // Marcar consumos como usados
    const consumptionsUsed = [];
    for (const idx of unusedIndexes) {
      purchases[idx].usedForRedemption = true;
      consumptionsUsed.push({
        amount: purchases[idx].amount,
        date: purchases[idx].date,
        invoiceNumber: purchases[idx].invoiceNumber || null,
        ruc: purchases[idx].ruc || null,
        receiptUrl: purchases[idx].receiptUrl || null,
      });
    }
    // Actualizar datos de cliente
    t.update(customerRef, {
      [`businesses.${businessSlug}.purchases`]: purchases,
    });
    // Crear registro de redención
    const redemptionRecord = {
      phoneNumber: normalizedPhone,
      customerName: redemptionData.customerName || customerData.profile?.name || 'Cliente',
      date: admin.firestore.FieldValue.serverTimestamp(),
      reward: redemptionData.reward,
      consumptionsUsed,
      approvedBy: redemptionData.approvedBy || null,
      status: 'approved',
    };
    const redemptionDocRef = redemptionsRef.doc();
    t.set(redemptionDocRef, redemptionRecord);
    return {
      success: true,
      redemption: redemptionRecord,
    };
  });
}

/**
 * Obtiene el historial de redenciones de un cliente para un negocio
 * @param {string} businessSlug
 * @param {string} phoneNumber
 * @returns {Promise<object[]>}
 */
async function getRedemptionHistory(businessSlug, phoneNumber) {
  if (!db) throw new Error('Firestore DB not initialized');
  const normalizedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
  const redemptionsRef = db.collection("business_redemptions").doc(businessSlug).collection("redemptions");
  const snapshot = await redemptionsRef.where("phoneNumber", "==", normalizedPhone).orderBy("date", "desc").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  setFirestoreDb,
  isDuplicateReceipt,
  findOrCreateCustomer,
  registerPurchase,
  getCustomerPointsInfo,
  findBusinessByRUC,
  redeemReward,
  getRedemptionHistory,
};
