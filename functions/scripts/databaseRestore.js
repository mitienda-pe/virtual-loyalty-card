// functions/src/utils/databaseRestore.js
const admin = require('firebase-admin');

// Inicializar Firebase si aún no está inicializado
try {
  admin.initializeApp();
} catch (e) {
  // App ya inicializada
}

const db = admin.firestore();

/**
 * Restaura los datos básicos en la base de datos
 */
async function restoreDatabase() {
  try {
    console.log('Iniciando restauración de la base de datos...');
    
    // Restaurar colección de negocios
    await restoreBusinesses();
    
    // Restaurar mapeo de RUC a slug
    await restoreRucMapping();
    
    console.log('✅ Restauración completada con éxito');
  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
  }
}

/**
 * Restaura la colección de negocios
 */
async function restoreBusinesses() {
  console.log('Restaurando colección de negocios...');
  
  const businesses = [
    {
      id: 'la-baguette',
      name: 'La Baguette',
      ruc: '20504680623',
      slug: 'la-baguette',
      address: 'JR. LUIS SANCHEZ CERRO 2128 JESUS MARIA',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];
  
  const batch = db.batch();
  
  for (const business of businesses) {
    const id = business.id;
    delete business.id;
    batch.set(db.collection('businesses').doc(id), business);
  }
  
  await batch.commit();
  console.log(`✅ Restaurados ${businesses.length} negocios`);
}

/**
 * Restaura el mapeo de RUC a slug
 */
async function restoreRucMapping() {
  console.log('Restaurando mapeo de RUC a slug...');
  
  const rucMappings = [
    {
      ruc: '20504680623',
      businessSlug: 'la-baguette',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];
  
  const batch = db.batch();
  
  for (const mapping of rucMappings) {
    batch.set(db.collection('ruc_business_map').doc(mapping.ruc), mapping);
  }
  
  await batch.commit();
  console.log(`✅ Restaurados ${rucMappings.length} mapeos de RUC`);
}

// Ejecutar la restauración
restoreDatabase().then(() => {
  console.log('Proceso de restauración finalizado');
}).catch(error => {
  console.error('Error en el proceso de restauración:', error);
});
