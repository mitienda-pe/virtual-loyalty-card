// functions/src/utils/restoreCollections.js
const admin = require('firebase-admin');

// Inicializar Firebase con el ID del proyecto explícito
try {
  admin.initializeApp({
    projectId: 'virtual-loyalty-card-e37c9'
  });
} catch (e) {
  // App ya inicializada
}

const db = admin.firestore();

/**
 * Restaura las colecciones básicas necesarias para el funcionamiento de la aplicación
 */
async function restoreBasicCollections() {
  try {
    console.log('Iniciando restauración de colecciones básicas...');
    
    // 1. Restaurar colección de negocios
    await restoreBusinesses();
    
    // 2. Restaurar mapeo de RUC a slug
    await restoreRucMapping();
    
    // 3. Crear colección de usuarios
    await restoreUsers();
    
    console.log('✅ Restauración de colecciones básicas completada');
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
      name: 'La Baguette',
      businessName: 'CORPORACION BAGUETERA S.A.C.',
      ruc: '20504680623',
      description: 'Panadería y cafetería',
      address: 'JR. LUIS SANCHEZ CERRO 2128 JESUS MARIA',
      city: 'Lima',
      config: {
        purchasesRequired: 10,
        timeLimit: 30,
        expirationDays: 90,
        icon: '🥖',
        backgroundColor: '#F5A623',
        reward: 'Un café gratis'
      }
    }
  ];
  
  const batch = db.batch();
  
  for (const business of businesses) {
    const slug = business.name.toLowerCase().replace(/\s+/g, '-');
    batch.set(db.collection('businesses').doc(slug), {
      ...business,
      slug: slug,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
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

/**
 * Restaura la colección de usuarios
 */
async function restoreUsers() {
  console.log('Restaurando colección de usuarios...');
  
  const users = [
    {
      email: 'chiste@gmail.com',
      role: 'admin',
      displayName: 'Administrador',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    }
  ];
  
  const batch = db.batch();
  
  for (const user of users) {
    // Usar un ID genérico para el usuario administrador
    batch.set(db.collection('users').doc('admin-user'), user);
  }
  
  await batch.commit();
  console.log(`✅ Restaurados ${users.length} usuarios`);
}

// Ejecutar la restauración
restoreBasicCollections().then(() => {
  console.log('Proceso de restauración finalizado');
}).catch(error => {
  console.error('Error en el proceso de restauración:', error);
});
