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
 * Verifica si un recibo ya ha sido registrado previamente considerando entidades específicas
 * @param {string} businessSlug - Slug del negocio
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {number} amount - Monto de la compra
 * @param {string} imageUrl - URL de la imagen del recibo
 * @param {object} invoiceData - Datos adicionales de la factura (debe incluir entityId)
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
      return false;
    }

    // Normalizar el número de teléfono para asegurar consistencia
    const normalizedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+${phoneNumber}`;

    // ACTUALIZADO: Si tenemos RUC, invoiceNumber y entityId, verificar duplicado específico por entidad
    if (invoiceData.ruc && invoiceData.invoiceNumber && invoiceData.entityId) {
      console.log(`🔍 Verificando duplicado específico para entidad: ${businessSlug}/${invoiceData.entityId}`);
      
      // Con entityId, el ID del invoice incluye la entidad para evitar conflictos
      const invoiceDocId = `${invoiceData.ruc}-${invoiceData.invoiceNumber}-${invoiceData.entityId}`;
      const invoiceDoc = await db.collection("invoices").doc(invoiceDocId).get();
      
      if (invoiceDoc.exists) {
        console.log(`⚠️ DUPLICADO ENCONTRADO: Factura con ID=${invoiceDocId} ya existe`);
        const duplicateDoc = invoiceDoc.data();
        console.log(`Detalles del duplicado: Fecha=${duplicateDoc.date}, Teléfono=${duplicateDoc.phoneNumber}, Entidad=${duplicateDoc.entityId}`);
        return true;
      }
      
      // También verificar en business_invoices como respaldo con entityId
      const purchasesRef = db
        .collection("business_invoices")
        .doc(businessSlug)
        .collection("purchases")
        .where("ruc", "==", invoiceData.ruc)
        .where("invoiceNumber", "==", invoiceData.invoiceNumber)
        .where("entityId", "==", invoiceData.entityId) // NUEVO: Filtrar por entidad específica
        .limit(1);

      const purchasesSnapshot = await purchasesRef.get();
      if (!purchasesSnapshot.empty) {
        console.log(`⚠️ Factura duplicada detectada en business_invoices: RUC ${invoiceData.ruc}, Número ${invoiceData.invoiceNumber}, Entidad ${invoiceData.entityId}`);
        return true;
      }
    } 
    // FALLBACK: Si no tenemos entityId, usar verificación legacy
    else if (invoiceData.ruc && invoiceData.invoiceNumber) {
      console.log(`🔍 Verificando duplicado legacy (sin entityId): ${invoiceData.ruc}-${invoiceData.invoiceNumber}`);
      
      // Verificar sin entityId para compatibilidad con datos legacy
      const invoiceDocId = `${invoiceData.ruc}-${invoiceData.invoiceNumber}`;
      const invoiceDoc = await db.collection("invoices").doc(invoiceDocId).get();
      
      if (invoiceDoc.exists) {
        console.log(`⚠️ DUPLICADO LEGACY ENCONTRADO: Factura con ID=${invoiceDocId} ya existe`);
        return true;
      }
      
      // Verificar en business_invoices sin filtro de entityId
      const purchasesRef = db
        .collection("business_invoices")
        .doc(businessSlug)
        .collection("purchases")
        .where("ruc", "==", invoiceData.ruc)
        .where("invoiceNumber", "==", invoiceData.invoiceNumber)
        .limit(1);

      const purchasesSnapshot = await purchasesRef.get();
      if (!purchasesSnapshot.empty) {
        console.log(`⚠️ Factura duplicada legacy detectada: RUC ${invoiceData.ruc}, Número ${invoiceData.invoiceNumber}`);
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
    console.log(`✅ No se detectó duplicado para ${businessSlug}/${invoiceData.entityId || 'legacy'} - ${invoiceData.ruc}-${invoiceData.invoiceNumber}`);
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
 * Registra una compra en el sistema con soporte para múltiples entidades
 * @param {string} businessSlug - Slug del negocio
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {number} amount - Monto de la compra
 * @param {string} imageUrl - URL de la imagen del recibo
 * @param {object} additionalData - Datos adicionales de la compra (debe incluir entityId y entity)
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

  // NUEVO: Validar que tengamos entityId y entity
  if (!additionalData.entityId || !additionalData.entity) {
    console.error("Error: entityId y entity son requeridos en registerPurchase");
    throw new Error("entityId y entity son requeridos para registrar compra");
  }

  // Validar que el número de comprobante (invoiceNumber) sea obligatorio
  if (
    !additionalData.invoiceNumber ||
    typeof additionalData.invoiceNumber !== "string" ||
    additionalData.invoiceNumber.trim() === ""
  ) {
    console.error(
      "Error: Número de comprobante (invoiceNumber) no proporcionado o vacío"
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
    `Registrando compra para ${phoneNumber} en ${businessSlug}/${additionalData.entityId} por ${amount}`
  );

  // Normalizar el número de teléfono para asegurar consistencia
  const normalizedPhone = phoneNumber.startsWith("+")
    ? phoneNumber
    : `+${phoneNumber}`;

  // NUEVO: Usar datos de la entidad específica
  const entity = additionalData.entity;
  const entityId = additionalData.entityId;
  
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

  // ACTUALIZADO: Crear registro de compra con entityId
  const purchaseRecord = {
    amount: parseFloat(amount),
    date: new Date(),
    receiptUrl: imageUrl,
    verified: true,
    entityId: entityId, // NUEVO
    invoiceNumber: additionalData.invoiceNumber || null,
    ruc: entity.ruc, // Usar RUC de la entidad específica
    address: entity.address, // Usar dirección de la entidad específica
    businessName: entity.businessName, // Usar razón social de la entidad específica
  };

  console.log(`Registro de compra creado para entidad ${entityId}: ${JSON.stringify(purchaseRecord)}`);

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

  // 2. Registrar la factura en la colección 'invoices' con entityId
  let invoiceId;
  if (entity.ruc && additionalData.invoiceNumber) {
    // ACTUALIZADO: Incluir entityId en el ID para evitar conflictos entre entidades
    invoiceId = `${entity.ruc}-${additionalData.invoiceNumber}-${entityId}`;
  } else {
    invoiceId = `${businessSlug}_${entityId}_${normalizedPhone}_${Date.now()}`;
  }
  
  console.log(`Registrando factura con ID: ${invoiceId}`);
  const invoiceRef = db.collection("invoices").doc(invoiceId);
  
  // Verificar si ya existe para evitar sobrescribir
  const existingInvoice = await invoiceRef.get();
  if (existingInvoice.exists) {
    console.log(`⚠️ Factura ${invoiceId} ya existe, saltando registro en invoices`);
  } else {
    await invoiceRef.set({
      businessSlug: businessSlug,
      entityId: entityId, // NUEVO
      phoneNumber: normalizedPhone,
      amount: parseFloat(amount),
      date: admin.firestore.FieldValue.serverTimestamp(),
      receiptUrl: imageUrl,
      verified: true,
      invoiceNumber: additionalData.invoiceNumber || null,
      ruc: entity.ruc, // RUC de la entidad específica
      address: entity.address, // Dirección de la entidad específica
      businessName: entity.businessName, // Razón social de la entidad específica
    });
    console.log(`✅ Factura registrada en invoices con ID: ${invoiceId}`);
  }

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
      extractedText: additionalData.extractedText || additionalData.fullText || null,
      id: purchaseId,
      phoneNumber: normalizedPhone,
      customerName: customerName,
      date: admin.firestore.FieldValue.serverTimestamp(),
      amount: parseFloat(amount),
      receiptUrl: imageUrl || null,
      verified: additionalData.verified || false,
      invoiceNumber: additionalData.invoiceNumber || null,
      ruc: additionalData.ruc || null,
      address: additionalData.address || null,
      businessName: additionalData.businessName || null,
      vendor: additionalData.vendor || null,
      purchaseDate: additionalData.purchaseDate || null,
      items: additionalData.items || [],
      hasStoredImage: additionalData.hasStoredImage || false,
      processedFromQueue: additionalData.processedFromQueue || false,
      queueId: additionalData.queueId || null,
      // Agregar otros campos adicionales sin duplicar
      ...Object.fromEntries(
        Object.entries(additionalData).filter(
          ([key]) =>
            ![
              "invoiceNumber",
              "ruc",
              "address",
              "businessName",
              "verified",
              "vendor",
              "purchaseDate",
              "items",
              "hasStoredImage",
              "processedFromQueue",
              "queueId",
              "extractedText",
              "fullText",
              "customerName"
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

    // 5. Actualizar ruc_business_map con entityId
    const rucMapRef = db.collection("ruc_business_map").doc(entity.ruc);
    await rucMapRef.set({ 
      businessSlug, 
      entityId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 5. Registrar en customer_businesses (nueva colección)
    try {
      const customerBusinessRef = db
        .collection("customer_businesses")
        .doc(normalizedPhone)
        .collection("businesses")
        .doc(businessSlug);

      const customerBusinessDoc = await customerBusinessRef.get();

      if (customerBusinessDoc.exists) {
        // Actualizar negocio existente para el cliente
        const existingData = customerBusinessDoc.data();
        await customerBusinessRef.update({
          totalSpent: (existingData.totalSpent || 0) + parseFloat(amount),
          purchaseCount: (existingData.purchaseCount || 0) + 1,
          lastVisit: admin.firestore.FieldValue.serverTimestamp(),
          lastPurchase: {
            amount: parseFloat(amount),
            date: admin.firestore.FieldValue.serverTimestamp(),
            entityId: entityId, // NUEVO
            invoiceNumber: additionalData.invoiceNumber || null,
            ruc: entity.ruc,
            businessName: entity.businessName
          }
        });
      } else {
        // Crear nuevo registro de negocio para el cliente
        // Obtener información del negocio
        let businessName = businessSlug;
        try {
          const businessDoc = await db.collection("businesses").doc(businessSlug).get();
          if (businessDoc.exists) {
            businessName = businessDoc.data().name || businessSlug;
          }
        } catch (err) {
          console.error(`Error obteniendo nombre del negocio ${businessSlug}:`, err);
        }

        await customerBusinessRef.set({
          businessSlug: businessSlug,
          businessName: businessName,
          totalSpent: parseFloat(amount),
          purchaseCount: 1,
          firstVisit: admin.firestore.FieldValue.serverTimestamp(),
          lastVisit: admin.firestore.FieldValue.serverTimestamp(),
          lastPurchase: {
            amount: parseFloat(amount),
            date: admin.firestore.FieldValue.serverTimestamp(),
            entityId: entityId, // NUEVO
            invoiceNumber: additionalData.invoiceNumber || null,
            ruc: entity.ruc,
            businessName: entity.businessName
          }
        });
      }

      console.log(
        "✅ Negocio registrado en customer_businesses:",
        `${normalizedPhone}/businesses/${businessSlug}`
      );
    } catch (err) {
      console.error("❌ Error registrando en customer_businesses:", err);
    }

    // 6. Registrar en customer_purchases (nueva colección)
    try {
      // ACTUALIZADO: Incluir entityId
      let customerPurchaseId = null;
      if (entity.ruc && additionalData.invoiceNumber) {
        customerPurchaseId = `${entity.ruc}-${additionalData.invoiceNumber}-${entityId}`;
      } else {
        customerPurchaseId = db
          .collection("customer_purchases")
          .doc(normalizedPhone)
          .collection("purchases")
          .doc().id;
      }

      const customerPurchaseRef = db
        .collection("customer_purchases")
        .doc(normalizedPhone)
        .collection("purchases")
        .doc(customerPurchaseId);

      // Obtener información del negocio para el registro
      let businessName = businessSlug;
      try {
        const businessDoc = await db.collection("businesses").doc(businessSlug).get();
        if (businessDoc.exists) {
          businessName = businessDoc.data().name || businessSlug;
        }
      } catch (err) {
        console.error(`Error obteniendo nombre del negocio ${businessSlug}:`, err);
      }

      const customerPurchaseData = {
        id: customerPurchaseId,
        businessSlug: businessSlug,
        businessName: businessName,
        entityId: entityId, // NUEVO
        entityBusinessName: entity.businessName, // NUEVO: Razón social específica
        entityAddress: entity.address, // NUEVO: Dirección específica
        amount: parseFloat(amount),
        date: admin.firestore.FieldValue.serverTimestamp(),
        receiptUrl: imageUrl,
        verified: additionalData.verified || true,
        invoiceNumber: additionalData.invoiceNumber || null,
        ruc: entity.ruc,
        address: entity.address, // Dirección de la entidad específica
        usedForRedemption: false,
        ...(additionalData.vendor ? { vendor: additionalData.vendor } : {}),
        ...(additionalData.items ? { items: additionalData.items } : {}),
        ...(additionalData.amountInWords ? { amountInWords: additionalData.amountInWords } : {})
      };

      await customerPurchaseRef.set(customerPurchaseData);
      console.log(
        "✅ Compra registrada en customer_purchases:",
        `${normalizedPhone}/purchases/${customerPurchaseId}`
      );
    } catch (err) {
      console.error("❌ Error registrando en customer_purchases:", err);
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
      entityId: entityId, // NUEVO
      entity: entity // NUEVO
    },
    purchase: {
      amount: parseFloat(amount),
      date: new Date(),
      invoiceId: invoiceId,
    },
    reward: escalatedReward || null,
  };

  console.log(
    `💾 FIN registerPurchase: Compra registrada exitosamente para ${normalizedPhone} en ${businessSlug}/${entityId}`
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
 * Busca un negocio y entidad específica por su RUC
 * @param {string} ruc - RUC del negocio/entidad
 * @returns {Promise<object|null>} - Datos del negocio y entidad específica o null si no existe
 */
async function findBusinessByRUC(ruc) {
  try {
    if (!ruc) {
      console.log("RUC no proporcionado para búsqueda de negocio");
      return null;
    }

    console.log(`🔍 Buscando negocio con RUC: ${ruc}`);

    // Primero buscar en el mapa de RUC a business slug
    const rucMapRef = db.collection("ruc_business_map").doc(ruc);
    const rucMapDoc = await rucMapRef.get();

    let businessSlug = null;
    let entityId = null;

    if (rucMapDoc.exists) {
      // Si existe en el mapa, obtener el slug y entityId
      const mapData = rucMapDoc.data();
      businessSlug = mapData.businessSlug;
      entityId = mapData.entityId; // NUEVO: ID de la entidad específica
      console.log(`Negocio encontrado en ruc_business_map: ${businessSlug}, entidad: ${entityId}`);
    } else {
      // Si no existe en el mapa, buscar en la colección de negocios
      console.log("No encontrado en ruc_business_map, buscando en businesses...");
      
      const businessesSnapshot = await db.collection("businesses").get();
      let foundBusiness = null;
      let foundEntity = null;

      // Buscar en todas las entidades de todos los negocios
      for (const businessDoc of businessesSnapshot.docs) {
        const businessData = businessDoc.data();
        
        if (businessData.entities && Array.isArray(businessData.entities)) {
          // Buscar en las entidades del negocio
          const entity = businessData.entities.find(e => e.ruc === ruc);
          if (entity) {
            foundBusiness = businessDoc;
            foundEntity = entity;
            businessSlug = businessDoc.id;
            entityId = entity.id;
            break;
          }
        } else if (businessData.ruc === ruc) {
          // Compatibilidad con estructura legacy (sin entidades)
          foundBusiness = businessDoc;
          businessSlug = businessDoc.id;
          entityId = "main"; // Entidad principal por defecto
          
          // Crear estructura de entidad para compatibilidad
          foundEntity = {
            id: "main",
            businessName: businessData.businessName || businessData.name,
            ruc: businessData.ruc,
            address: businessData.address,
            isMain: true
          };
          break;
        }
      }

      if (!foundBusiness) {
        console.log(`No se encontró negocio con RUC: ${ruc}`);
        return null;
      }

      // Guardar en el mapa para futuras búsquedas
      await rucMapRef.set({ 
        businessSlug, 
        entityId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Negocio encontrado y guardado en mapa: ${businessSlug}, entidad: ${entityId}`);
    }

    // Ahora obtener los datos completos del negocio
    const businessRef = db.collection("businesses").doc(businessSlug);
    const businessDoc = await businessRef.get();

    if (!businessDoc.exists) {
      console.log(`Negocio con slug ${businessSlug} no encontrado`);
      return null;
    }

    const businessData = businessDoc.data();

    // Encontrar la entidad específica
    let entity = null;
    
    if (businessData.entities && Array.isArray(businessData.entities)) {
      entity = businessData.entities.find(e => e.id === entityId);
    } else if (entityId === "main") {
      // Estructura legacy - crear entidad principal
      entity = {
        id: "main",
        businessName: businessData.businessName || businessData.name,
        ruc: businessData.ruc,
        address: businessData.address,
        isMain: true
      };
    }

    if (!entity) {
      console.log(`Entidad ${entityId} no encontrada en negocio ${businessSlug}`);
      return null;
    }

    console.log(`✅ Negocio y entidad encontrados: ${businessSlug}/${entityId}`);

    return {
      id: businessSlug,
      slug: businessSlug,
      entityId: entityId,
      entity: entity,
      ...businessData,
      // Mantener campos legacy para compatibilidad
      businessName: entity.businessName,
      ruc: entity.ruc,
      address: entity.address
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
    
    // Buscar consumos no usados (FIFO) en la estructura actual
    const purchases = businessData.purchases;
    const unusedIndexes = [];
    for (let i = 0; i < purchases.length; i++) {
      if (!purchases[i].usedForRedemption) unusedIndexes.push(i);
      if (unusedIndexes.length === consumptionsNeeded) break;
    }
    if (unusedIndexes.length < consumptionsNeeded) {
      throw new Error('No hay suficientes consumos para redimir la recompensa');
    }
    
    // Marcar consumos como usados en la estructura actual
    const consumptionsUsed = [];
    const purchaseIdsToUpdate = []; // Para actualizar en customer_purchases
    
    for (const idx of unusedIndexes) {
      purchases[idx].usedForRedemption = true;
      consumptionsUsed.push({
        amount: purchases[idx].amount,
        date: purchases[idx].date,
        invoiceNumber: purchases[idx].invoiceNumber || null,
        ruc: purchases[idx].ruc || null,
        receiptUrl: purchases[idx].receiptUrl || null,
      });
      
      // Si tenemos RUC e invoiceNumber, guardamos el ID para actualizar customer_purchases
      if (purchases[idx].ruc && purchases[idx].invoiceNumber) {
        purchaseIdsToUpdate.push(`${purchases[idx].ruc}-${purchases[idx].invoiceNumber}`);
      }
    }
    
    // Actualizar datos de cliente (estructura actual)
    t.update(customerRef, {
      [`businesses.${businessSlug}.purchases`]: purchases,
    });
    
    // También marcar como usados en customer_purchases (nueva estructura)
    for (const purchaseId of purchaseIdsToUpdate) {
      const customerPurchaseRef = db
        .collection("customer_purchases")
        .doc(normalizedPhone)
        .collection("purchases")
        .doc(purchaseId);
      
      try {
        t.update(customerPurchaseRef, {
          usedForRedemption: true,
          redemptionDate: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (updateError) {
        console.warn(`No se pudo actualizar customer_purchases para ${purchaseId}:`, updateError.message);
        // No interrumpimos la transacción por esto
      }
    }
    
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

/**
 * Obtiene las compras de un cliente desde la nueva estructura customer_purchases
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {string} [businessSlug] - Slug del negocio (opcional) para filtrar
 * @param {number} [limit] - Límite de resultados (opcional)
 * @returns {Promise<object[]>} - Array de compras
 */
async function getCustomerPurchases(phoneNumber, businessSlug = null, limit = null) {
  try {
    if (!db) throw new Error('Firestore DB not initialized');
    
    const normalizedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
    let query = db.collection("customer_purchases")
      .doc(normalizedPhone)
      .collection("purchases")
      .orderBy("date", "desc");
    
    // Filtrar por negocio si se especifica
    if (businessSlug) {
      query = query.where("businessSlug", "==", businessSlug);
    }
    
    // Aplicar límite si se especifica
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error obteniendo compras del cliente:', error);
    return [];
  }
}

/**
 * Obtiene los negocios de un cliente desde la nueva estructura customer_businesses
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @returns {Promise<object[]>} - Array de negocios del cliente
 */
async function getCustomerBusinesses(phoneNumber) {
  try {
    if (!db) throw new Error('Firestore DB not initialized');
    
    const normalizedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
    const snapshot = await db.collection("customer_businesses")
      .doc(normalizedPhone)
      .collection("businesses")
      .orderBy("lastVisit", "desc")
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error obteniendo negocios del cliente:', error);
    return [];
  }
}

/**
 * Busca una entidad por RUC en todos los negocios
 * @param {string} ruc - RUC a buscar
 * @returns {Promise<object|null>} - { businessSlug, entityId } o null
 */
async function findEntityByRUCInAllBusinesses(ruc) {
  try {
    // Obtener todos los negocios que tengan businessEntities
    const businessesSnapshot = await db
      .collection("businesses")
      .where("businessEntities", "!=", null)
      .get();

    for (const businessDoc of businessesSnapshot.docs) {
      const businessData = businessDoc.data();
      const businessSlug = businessDoc.id;
      
      if (businessData.businessEntities && Array.isArray(businessData.businessEntities)) {
        const entity = businessData.businessEntities.find(e => e.ruc === ruc);
        if (entity) {
          return {
            businessSlug,
            entityId: entity.id
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error buscando entidad por RUC:", error);
    return null;
  }
}

/**
 * Agrega una nueva entidad comercial a un negocio
 * @param {string} businessSlug - Slug del negocio
 * @param {object} entityData - Datos de la nueva entidad
 * @returns {Promise<object>} - Resultado de la operación
 */
async function addBusinessEntity(businessSlug, entityData) {
  try {
    if (!businessSlug || !entityData) {
      throw new Error('businessSlug y entityData son requeridos');
    }

    // Validar campos obligatorios
    const requiredFields = ['businessName', 'ruc', 'address'];
    for (const field of requiredFields) {
      if (!entityData[field] || typeof entityData[field] !== 'string' || entityData[field].trim() === '') {
        throw new Error(`Campo obligatorio faltante o inválido: ${field}`);
      }
    }

    // Validar que el RUC sea único globalmente
    const isRucUnique = await validateUniqueRUC(entityData.ruc, businessSlug);
    if (!isRucUnique) {
      throw new Error(`El RUC ${entityData.ruc} ya está registrado en otro negocio o entidad`);
    }

    // Obtener el negocio actual
    const businessRef = db.collection("businesses").doc(businessSlug);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      throw new Error(`Negocio no encontrado: ${businessSlug}`);
    }

    const businessData = businessDoc.data();
    
    // Inicializar businessEntities si no existe
    if (!businessData.businessEntities) {
      businessData.businessEntities = [];
    }

    // Generar ID único para la entidad
    const entityId = entityData.id || `entity_${Date.now()}`;
    
    // Verificar que el entityId no exista ya en este negocio
    const existingEntity = businessData.businessEntities.find(e => e.id === entityId);
    if (existingEntity) {
      throw new Error(`Ya existe una entidad con ID: ${entityId}`);
    }

    // Preparar la nueva entidad
    const newEntity = {
      id: entityId,
      businessName: entityData.businessName.trim(),
      ruc: entityData.ruc.trim(),
      address: entityData.address.trim(),
      locations: entityData.locations || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Agregar la nueva entidad
    businessData.businessEntities.push(newEntity);

    // Actualizar el documento
    await businessRef.update({
      businessEntities: businessData.businessEntities,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Actualizar ruc_business_map
    await db.collection("ruc_business_map").doc(entityData.ruc).set({
      businessSlug,
      entityId
    });

    console.log(`✅ Entidad agregada: ${businessSlug}/${entityId}`);
    
    return {
      success: true,
      entityId,
      entity: newEntity
    };
  } catch (error) {
    console.error('Error agregando entidad comercial:', error);
    throw error;
  }
}

/**
 * Actualiza una entidad comercial existente
 * @param {string} businessSlug - Slug del negocio
 * @param {string} entityId - ID de la entidad
 * @param {object} entityData - Nuevos datos de la entidad
 * @returns {Promise<object>} - Resultado de la operación
 */
async function updateBusinessEntity(businessSlug, entityId, entityData) {
  try {
    if (!businessSlug || !entityId || !entityData) {
      throw new Error('businessSlug, entityId y entityData son requeridos');
    }

    // Obtener el negocio actual
    const businessRef = db.collection("businesses").doc(businessSlug);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      throw new Error(`Negocio no encontrado: ${businessSlug}`);
    }

    const businessData = businessDoc.data();
    
    if (!businessData.businessEntities || !Array.isArray(businessData.businessEntities)) {
      throw new Error('El negocio no tiene entidades comerciales');
    }

    // Encontrar la entidad
    const entityIndex = businessData.businessEntities.findIndex(e => e.id === entityId);
    if (entityIndex === -1) {
      throw new Error(`Entidad no encontrada: ${entityId}`);
    }

    const currentEntity = businessData.businessEntities[entityIndex];
    
    // Si se está cambiando el RUC, validar unicidad
    if (entityData.ruc && entityData.ruc !== currentEntity.ruc) {
      const isRucUnique = await validateUniqueRUC(entityData.ruc, businessSlug, entityId);
      if (!isRucUnique) {
        throw new Error(`El RUC ${entityData.ruc} ya está registrado en otro negocio o entidad`);
      }
    }

    // Actualizar la entidad
    const updatedEntity = {
      ...currentEntity,
      ...entityData,
      id: entityId, // Mantener el ID original
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    businessData.businessEntities[entityIndex] = updatedEntity;

    // Actualizar el documento
    await businessRef.update({
      businessEntities: businessData.businessEntities,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Si cambió el RUC, actualizar ruc_business_map
    if (entityData.ruc && entityData.ruc !== currentEntity.ruc) {
      // Eliminar el mapeo anterior
      await db.collection("ruc_business_map").doc(currentEntity.ruc).delete();
      
      // Crear el nuevo mapeo
      await db.collection("ruc_business_map").doc(entityData.ruc).set({
        businessSlug,
        entityId
      });
    }

    console.log(`✅ Entidad actualizada: ${businessSlug}/${entityId}`);
    
    return {
      success: true,
      entity: updatedEntity
    };
  } catch (error) {
    console.error('Error actualizando entidad comercial:', error);
    throw error;
  }
}

/**
 * Elimina una entidad comercial
 * @param {string} businessSlug - Slug del negocio
 * @param {string} entityId - ID de la entidad
 * @returns {Promise<object>} - Resultado de la operación
 */
async function removeBusinessEntity(businessSlug, entityId) {
  try {
    if (!businessSlug || !entityId) {
      throw new Error('businessSlug y entityId son requeridos');
    }

    // Obtener el negocio actual
    const businessRef = db.collection("businesses").doc(businessSlug);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      throw new Error(`Negocio no encontrado: ${businessSlug}`);
    }

    const businessData = businessDoc.data();
    
    if (!businessData.businessEntities || !Array.isArray(businessData.businessEntities)) {
      throw new Error('El negocio no tiene entidades comerciales');
    }

    // Validar que no sea la única entidad
    if (businessData.businessEntities.length === 1) {
      throw new Error('No se puede eliminar la única entidad comercial del negocio');
    }

    // Encontrar la entidad
    const entityIndex = businessData.businessEntities.findIndex(e => e.id === entityId);
    if (entityIndex === -1) {
      throw new Error(`Entidad no encontrada: ${entityId}`);
    }

    const entityToRemove = businessData.businessEntities[entityIndex];
    
    // Eliminar la entidad
    businessData.businessEntities.splice(entityIndex, 1);

    // Actualizar el documento
    await businessRef.update({
      businessEntities: businessData.businessEntities,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Eliminar del ruc_business_map
    await db.collection("ruc_business_map").doc(entityToRemove.ruc).delete();

    console.log(`✅ Entidad eliminada: ${businessSlug}/${entityId}`);
    
    return {
      success: true,
      removedEntity: entityToRemove
    };
  } catch (error) {
    console.error('Error eliminando entidad comercial:', error);
    throw error;
  }
}

/**
 * Obtiene una entidad específica de un negocio
 * @param {string} businessSlug - Slug del negocio
 * @param {string} entityId - ID de la entidad
 * @returns {Promise<object|null>} - Datos de la entidad o null
 */
async function getBusinessEntity(businessSlug, entityId) {
  try {
    if (!businessSlug || !entityId) {
      throw new Error('businessSlug y entityId son requeridos');
    }

    const businessRef = db.collection("businesses").doc(businessSlug);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      return null;
    }

    const businessData = businessDoc.data();
    
    if (!businessData.businessEntities || !Array.isArray(businessData.businessEntities)) {
      return null;
    }

    const entity = businessData.businessEntities.find(e => e.id === entityId);
    return entity || null;
  } catch (error) {
    console.error('Error obteniendo entidad:', error);
    return null;
  }
}

/**
 * Obtiene todas las entidades de un negocio
 * @param {string} businessSlug - Slug del negocio
 * @returns {Promise<object[]>} - Array de entidades
 */
async function getAllBusinessEntities(businessSlug) {
  try {
    if (!businessSlug) {
      throw new Error('businessSlug es requerido');
    }

    const businessRef = db.collection("businesses").doc(businessSlug);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      return [];
    }

    const businessData = businessDoc.data();
    return businessData.businessEntities || [];
  } catch (error) {
    console.error('Error obteniendo entidades:', error);
    return [];
  }
}

/**
 * Valida que un RUC sea único globalmente
 * @param {string} ruc - RUC a validar
 * @param {string} [excludeBusinessSlug] - Negocio a excluir de la validación
 * @param {string} [excludeEntityId] - Entidad a excluir de la validación
 * @returns {Promise<boolean>} - true si es único, false si ya existe
 */
async function validateUniqueRUC(ruc, excludeBusinessSlug = null, excludeEntityId = null) {
  try {
    if (!ruc) {
      return false;
    }

    // Verificar en RUCs principales de negocios
    const businessesSnapshot = await db
      .collection("businesses")
      .where("ruc", "==", ruc)
      .get();

    // Si encontramos un negocio con este RUC, verificar si es el que estamos excluyendo
    if (!businessesSnapshot.empty) {
      const foundBusinessSlug = businessesSnapshot.docs[0].id;
      if (foundBusinessSlug !== excludeBusinessSlug) {
        return false; // RUC ya existe en otro negocio
      }
    }

    // Verificar en entidades de todos los negocios
    const allBusinessesSnapshot = await db
      .collection("businesses")
      .where("businessEntities", "!=", null)
      .get();

    for (const businessDoc of allBusinessesSnapshot.docs) {
      const businessSlug = businessDoc.id;
      const businessData = businessDoc.data();
      
      if (businessData.businessEntities && Array.isArray(businessData.businessEntities)) {
        for (const entity of businessData.businessEntities) {
          if (entity.ruc === ruc) {
            // Si es la misma entidad que estamos excluyendo, continuar
            if (businessSlug === excludeBusinessSlug && entity.id === excludeEntityId) {
              continue;
            }
            return false; // RUC ya existe en otra entidad
          }
        }
      }
    }

    return true; // RUC es único
  } catch (error) {
    console.error('Error validando unicidad de RUC:', error);
    return false;
  }
}

/**
 * Buscar entidad por RUC (wrapper de findBusinessByRUC)
 * @param {string} ruc - RUC a buscar
 * @returns {Promise<object|null>} - Datos del negocio y entidad
 */
async function findEntityByRUC(ruc) {
  return await findBusinessByRUC(ruc);
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
  getCustomerPurchases,
  getCustomerBusinesses,
  // Nuevas funciones para entidades comerciales
  findEntityByRUCInAllBusinesses,
  addBusinessEntity,
  updateBusinessEntity,
  removeBusinessEntity,
  getBusinessEntity,
  getAllBusinessEntities,
  validateUniqueRUC,
  findEntityByRUC,
};
