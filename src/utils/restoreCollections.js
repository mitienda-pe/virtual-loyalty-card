// Script ultra-simple para restaurar las colecciones básicas en Firestore
// IMPORTANTE: Copia y pega este código en la consola del navegador

// Acceder a Firestore
const firestore = firebase.firestore();
const auth = firebase.auth();

if (!auth.currentUser) {
  console.error('❌ No hay usuario autenticado. Debes iniciar sesión primero.');
} else {
  console.log('Iniciando restauración de colecciones básicas...');
  
  // 1. Restaurar colección de negocios (businesses)
  restoreBusinesses()
    .then(() => restoreRucMapping())
    .then(() => createEmptyCollections())
    .then(() => {
      console.log('✅ Restauración de colecciones básicas completada');
      console.log('Ahora puedes comenzar a usar la aplicación normalmente.');
    })
    .catch(error => {
      console.error('❌ Error al restaurar colecciones:', error);
    });
}

// Restaurar colección de negocios
function restoreBusinesses() {
  console.log('Restaurando colección de negocios (businesses)...');
  
  // Datos de ejemplo para la colección businesses basados en la estructura de la memoria
  const businesses = [
    {
      name: 'La Baguette',
      businessName: 'CORPORACION BAGUETERA S.A.C.',
      ruc: '20504680623',
      slug: 'la-baguette',
      description: 'Panadería y cafetería',
      address: 'JR. LUIS SANCHEZ CERRO 2128 JESUS MARIA',
      city: 'Lima',
      phone: '+51999999999',
      logo: 'https://firebasestorage.googleapis.com/v0/b/virtual-loyalty-card-e37c9.appspot.com/o/businesses%2Fla-baguette%2Flogo.png?alt=media',
      cover: 'https://firebasestorage.googleapis.com/v0/b/virtual-loyalty-card-e37c9.appspot.com/o/businesses%2Fla-baguette%2Fcover.jpg?alt=media',
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
    },
    {
      name: 'Cafetería Perú',
      businessName: 'CAFETERIA PERU S.A.C.',
      ruc: '20123456789',
      slug: 'cafeteria-peru',
      description: 'Cafetería y pastelería',
      address: 'AV. AREQUIPA 1250, LIMA',
      city: 'Lima',
      phone: '+51988888888',
      logo: 'https://firebasestorage.googleapis.com/v0/b/virtual-loyalty-card-e37c9.appspot.com/o/businesses%2Fcafeteria-peru%2Flogo.png?alt=media',
      cover: 'https://firebasestorage.googleapis.com/v0/b/virtual-loyalty-card-e37c9.appspot.com/o/businesses%2Fcafeteria-peru%2Fcover.jpg?alt=media',
      active: true,
      config: {
        purchasesRequired: 8,
        timeLimit: 60,
        expirationDays: 120,
        icon: '☕',
        backgroundColor: '#8B572A',
        reward: 'Un postre gratis'
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }
  ];
  
  // Crear documentos en la colección businesses
  const batch = firestore.batch();
  
  for (const business of businesses) {
    const docRef = firestore.collection('businesses').doc(business.slug);
    batch.set(docRef, business);
  }
  
  return batch.commit()
    .then(() => console.log(`✅ Restaurados ${businesses.length} negocios`));
}

// Restaurar mapeo de RUC a slug
function restoreRucMapping() {
  console.log('Restaurando mapeo de RUC a slug (ruc_business_map)...');
  
  // Datos para la colección ruc_business_map
  const rucMappings = [
    {
      ruc: '20504680623',
      businessSlug: 'la-baguette',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    },
    {
      ruc: '20123456789',
      businessSlug: 'cafeteria-peru',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }
  ];
  
  // Crear documentos en la colección ruc_business_map
  const batch = firestore.batch();
  
  for (const mapping of rucMappings) {
    const docRef = firestore.collection('ruc_business_map').doc(mapping.ruc);
    batch.set(docRef, mapping);
  }
  
  return batch.commit()
    .then(() => console.log(`✅ Restaurados ${rucMappings.length} mapeos de RUC`));
}

// Crear colecciones vacías para clientes y compras
function createEmptyCollections() {
  console.log('Creando colecciones vacías para clientes y compras...');
  
  // Lista de colecciones a crear basadas en la estructura de la memoria
  const collections = [
    'customers',
    'business_customers',
    'business_purchases',
    'invoices',
    'processing_queue'
  ];
  
  // Crear un documento temporal en cada colección para asegurarnos de que existan
  const batch = firestore.batch();
  
  for (const collectionName of collections) {
    const docRef = firestore.collection(collectionName).doc('_temp');
    batch.set(docRef, {
      _temp: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      note: 'Este es un documento temporal para crear la colección'
    });
  }
  
  return batch.commit()
    .then(() => {
      console.log(`✅ Creadas ${collections.length} colecciones vacías`);
      
      // Eliminar los documentos temporales después de un breve retraso
      setTimeout(() => {
        const deleteBatch = firestore.batch();
        
        for (const collectionName of collections) {
          const docRef = firestore.collection(collectionName).doc('_temp');
          deleteBatch.delete(docRef);
        }
        
        deleteBatch.commit()
          .then(() => console.log('✅ Documentos temporales eliminados'))
          .catch(error => console.error('Error al eliminar documentos temporales:', error));
      }, 2000);
    });
}
