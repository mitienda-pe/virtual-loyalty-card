// Script para restaurar las colecciones básicas de Firestore
// Copia y pega este código en la consola del navegador en tu aplicación Vue

// Función principal de restauración
async function restoreFirestoreData() {
  console.log('Iniciando restauración de datos en Firestore...');
  
  try {
    // 1. Restaurar colección de negocios
    await restoreBusinesses();
    
    // 2. Restaurar mapeo de RUC a slug
    await restoreRucMapping();
    
    // 3. Restaurar colección de usuarios
    await restoreUsers();
    
    console.log('✅ Restauración completada con éxito');
  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
  }
}

// Restaurar colección de negocios
async function restoreBusinesses() {
  console.log('Restaurando colección de negocios...');
  
  const businesses = [
    {
      name: 'La Baguette',
      businessName: 'CORPORACION BAGUETERA S.A.C.',
      ruc: '20504680623',
      slug: 'la-baguette',
      address: 'JR. LUIS SANCHEZ CERRO 2128 JESUS MARIA',
      city: 'Lima',
      active: true,
      config: {
        purchasesRequired: 10,
        timeLimit: 30,
        expirationDays: 90,
        icon: '🥖',
        backgroundColor: '#F5A623',
        reward: 'Un café gratis'
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }
  ];
  
  const db = firebase.firestore();
  const batch = db.batch();
  
  for (const business of businesses) {
    const slug = business.slug;
    batch.set(db.collection('businesses').doc(slug), business);
  }
  
  await batch.commit();
  console.log(`✅ Restaurados ${businesses.length} negocios`);
}

// Restaurar mapeo de RUC a slug
async function restoreRucMapping() {
  console.log('Restaurando mapeo de RUC a slug...');
  
  const rucMappings = [
    {
      ruc: '20504680623',
      businessSlug: 'la-baguette',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }
  ];
  
  const db = firebase.firestore();
  const batch = db.batch();
  
  for (const mapping of rucMappings) {
    batch.set(db.collection('ruc_business_map').doc(mapping.ruc), mapping);
  }
  
  await batch.commit();
  console.log(`✅ Restaurados ${rucMappings.length} mapeos de RUC`);
}

// Restaurar colección de usuarios
async function restoreUsers() {
  console.log('Restaurando colección de usuarios...');
  
  // Obtener el usuario actual
  const currentUser = firebase.auth().currentUser;
  
  if (!currentUser) {
    console.error('❌ No hay usuario autenticado');
    return;
  }
  
  const userData = {
    email: currentUser.email,
    displayName: currentUser.displayName || 'Administrador',
    role: 'admin',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  const db = firebase.firestore();
  await db.collection('users').doc(currentUser.uid).set(userData);
  
  console.log(`✅ Usuario restaurado: ${currentUser.email}`);
}

// Ejecutar la restauración
restoreFirestoreData();
