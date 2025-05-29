// functions/src/utils/migrateToNewStructure.js
const admin = require('firebase-admin');

// Inicializar Firebase si aún no está inicializado
try {
  admin.initializeApp({
    projectId: 'virtual-loyalty-card-e37c9'
  });
} catch (e) {
  // App ya inicializada
}

const db = admin.firestore();

/**
 * Migra los datos existentes de customers a las nuevas estructuras
 * customer_businesses y customer_purchases
 */
async function migrateToNewStructure() {
  console.log('🚀 Iniciando migración a nuevas estructuras...');
  
  try {
    // Obtener todos los clientes existentes
    const customersSnapshot = await db.collection('customers').get();
    console.log(`📊 Encontrados ${customersSnapshot.size} clientes para migrar`);
    
    let processedCustomers = 0;
    let totalBusinesses = 0;
    let totalPurchases = 0;
    
    // Procesar cada cliente
    for (const customerDoc of customersSnapshot.docs) {
      const phoneNumber = customerDoc.id;
      const customerData = customerDoc.data();
      
      console.log(`👤 Procesando cliente: ${phoneNumber}`);
      
      // Verificar si el cliente tiene negocios
      if (!customerData.businesses || Object.keys(customerData.businesses).length === 0) {
        console.log(`⚠️ Cliente ${phoneNumber} no tiene negocios, saltando...`);
        continue;
      }
      
      // Procesar cada negocio del cliente
      for (const [businessSlug, businessData] of Object.entries(customerData.businesses)) {
        console.log(`🏢 Procesando negocio: ${businessSlug} para cliente ${phoneNumber}`);
        
        try {
          // 1. Migrar a customer_businesses
          await migrateCustomerBusiness(phoneNumber, businessSlug, businessData);
          totalBusinesses++;
          
          // 2. Migrar purchases a customer_purchases
          if (businessData.purchases && Array.isArray(businessData.purchases)) {
            for (const purchase of businessData.purchases) {
              await migrateCustomerPurchase(phoneNumber, businessSlug, purchase);
              totalPurchases++;
            }
          }
          
        } catch (error) {
          console.error(`❌ Error migrando negocio ${businessSlug} para cliente ${phoneNumber}:`, error);
        }
      }
      
      processedCustomers++;
      
      // Log de progreso cada 10 clientes
      if (processedCustomers % 10 === 0) {
        console.log(`📈 Progreso: ${processedCustomers}/${customersSnapshot.size} clientes procesados`);
      }
    }
    
    console.log('✅ Migración completada exitosamente');
    console.log(`📊 Estadísticas:`);
    console.log(`   - Clientes procesados: ${processedCustomers}`);
    console.log(`   - Relaciones negocio-cliente creadas: ${totalBusinesses}`);
    console.log(`   - Compras migradas: ${totalPurchases}`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

/**
 * Migra los datos de un negocio para un cliente a customer_businesses
 */
async function migrateCustomerBusiness(phoneNumber, businessSlug, businessData) {
  try {
    // Obtener información del negocio
    let businessName = businessSlug;
    try {
      const businessDoc = await db.collection('businesses').doc(businessSlug).get();
      if (businessDoc.exists) {
        businessName = businessDoc.data().name || businessSlug;
      }
    } catch (error) {
      console.warn(`⚠️ No se pudo obtener nombre del negocio ${businessSlug}:`, error.message);
    }
    
    const customerBusinessRef = db
      .collection('customer_businesses')
      .doc(phoneNumber)
      .collection('businesses')
      .doc(businessSlug);
    
    // Verificar si ya existe
    const existingDoc = await customerBusinessRef.get();
    if (existingDoc.exists) {
      console.log(`ℹ️ Relación cliente-negocio ya existe para ${phoneNumber}-${businessSlug}, saltando...`);
      return;
    }
    
    // Preparar datos para customer_businesses
    const customerBusinessData = {
      businessSlug: businessSlug,
      businessName: businessName,
      totalSpent: businessData.totalSpent || 0,
      purchaseCount: businessData.purchaseCount || (businessData.purchases ? businessData.purchases.length : 0),
      firstVisit: businessData.firstVisit || new Date(),
      lastVisit: businessData.lastVisit || new Date(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Agregar última compra si existe
    if (businessData.purchases && businessData.purchases.length > 0) {
      const lastPurchase = businessData.purchases[businessData.purchases.length - 1];
      customerBusinessData.lastPurchase = {
        amount: lastPurchase.amount || 0,
        date: lastPurchase.date || new Date(),
        invoiceNumber: lastPurchase.invoiceNumber || null,
        ruc: lastPurchase.ruc || null
      };
    }
    
    await customerBusinessRef.set(customerBusinessData);
    console.log(`✅ Migrado customer_business: ${phoneNumber}/${businessSlug}`);
    
  } catch (error) {
    console.error(`❌ Error migrando customer_business ${phoneNumber}/${businessSlug}:`, error);
    throw error;
  }
}

/**
 * Migra una compra individual a customer_purchases
 */
async function migrateCustomerPurchase(phoneNumber, businessSlug, purchase) {
  try {
    // Obtener información del negocio
    let businessName = businessSlug;
    try {
      const businessDoc = await db.collection('businesses').doc(businessSlug).get();
      if (businessDoc.exists) {
        businessName = businessDoc.data().name || businessSlug;
      }
    } catch (error) {
      console.warn(`⚠️ No se pudo obtener nombre del negocio ${businessSlug}:`, error.message);
    }
    
    // Crear ID único para la compra basado en RUC + invoice number si están disponibles
    let purchaseId = null;
    if (purchase.ruc && purchase.invoiceNumber) {
      purchaseId = `${purchase.ruc}-${purchase.invoiceNumber}`;
    } else {
      // Generar ID único basado en timestamp y datos de la compra
      const timestamp = purchase.date ? (purchase.date.toDate ? purchase.date.toDate().getTime() : new Date(purchase.date).getTime()) : Date.now();
      purchaseId = `${businessSlug}-${phoneNumber.replace(/[^0-9]/g, '')}-${timestamp}`;
    }
    
    const customerPurchaseRef = db
      .collection('customer_purchases')
      .doc(phoneNumber)
      .collection('purchases')
      .doc(purchaseId);
    
    // Verificar si ya existe
    const existingDoc = await customerPurchaseRef.get();
    if (existingDoc.exists) {
      console.log(`ℹ️ Compra ya existe para ${phoneNumber}/${purchaseId}, saltando...`);
      return;
    }
    
    // Preparar datos para customer_purchases
    const customerPurchaseData = {
      id: purchaseId,
      businessSlug: businessSlug,
      businessName: businessName,
      amount: purchase.amount || 0,
      date: purchase.date || admin.firestore.FieldValue.serverTimestamp(),
      receiptUrl: purchase.receiptUrl || null,
      verified: purchase.verified !== undefined ? purchase.verified : true,
      invoiceNumber: purchase.invoiceNumber || null,
      ruc: purchase.ruc || null,
      address: purchase.address || null,
      businessName: purchase.businessName || businessName,
      usedForRedemption: purchase.usedForRedemption || false,
      // Campos adicionales si existen
      ...(purchase.vendor ? { vendor: purchase.vendor } : {}),
      ...(purchase.items ? { items: purchase.items } : {}),
      ...(purchase.amountInWords ? { amountInWords: purchase.amountInWords } : {}),
      // Metadatos de migración
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      migratedFrom: 'customers_collection'
    };
    
    await customerPurchaseRef.set(customerPurchaseData);
    console.log(`✅ Migrada compra: ${phoneNumber}/${purchaseId}`);
    
  } catch (error) {
    console.error(`❌ Error migrando compra para ${phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Verifica la integridad de los datos migrados
 */
async function verifyMigration() {
  console.log('🔍 Verificando integridad de la migración...');
  
  try {
    // Contar documentos en estructuras originales y nuevas
    const customersSnapshot = await db.collection('customers').get();
    let originalBusinessesCount = 0;
    let originalPurchasesCount = 0;
    
    for (const customerDoc of customersSnapshot.docs) {
      const customerData = customerDoc.data();
      if (customerData.businesses) {
        originalBusinessesCount += Object.keys(customerData.businesses).length;
        for (const businessData of Object.values(customerData.businesses)) {
          if (businessData.purchases && Array.isArray(businessData.purchases)) {
            originalPurchasesCount += businessData.purchases.length;
          }
        }
      }
    }
    
    // Contar en las nuevas estructuras
    let migratedBusinessesCount = 0;
    let migratedPurchasesCount = 0;
    
    const customerBusinessesSnapshot = await db.collectionGroup('businesses').get();
    migratedBusinessesCount = customerBusinessesSnapshot.size;
    
    const customerPurchasesSnapshot = await db.collectionGroup('purchases').get();
    migratedPurchasesCount = customerPurchasesSnapshot.size;
    
    console.log('📊 Resultados de verificación:');
    console.log(`   Negocios originales: ${originalBusinessesCount}`);
    console.log(`   Negocios migrados: ${migratedBusinessesCount}`);
    console.log(`   Compras originales: ${originalPurchasesCount}`);
    console.log(`   Compras migradas: ${migratedPurchasesCount}`);
    
    if (originalBusinessesCount === migratedBusinessesCount && originalPurchasesCount === migratedPurchasesCount) {
      console.log('✅ Verificación exitosa: todos los datos fueron migrados correctamente');
    } else {
      console.log('⚠️ Advertencia: hay diferencias en los conteos, revisar migración');
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    throw error;
  }
}

/**
 * Función principal que ejecuta la migración completa
 */
async function runMigration() {
  try {
    console.log('🚀 Iniciando proceso de migración completo...');
    
    // Ejecutar migración
    await migrateToNewStructure();
    
    // Verificar resultados
    await verifyMigration();
    
    console.log('🎉 Proceso de migración completado exitosamente');
    
  } catch (error) {
    console.error('💥 Error en el proceso de migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración si este archivo se ejecuta directamente
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Migración finalizada');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateToNewStructure,
  migrateCustomerBusiness,
  migrateCustomerPurchase,
  verifyMigration,
  runMigration
};
