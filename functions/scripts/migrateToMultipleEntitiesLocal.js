#!/usr/bin/env node

/**
 * Script de migración para convertir negocios existentes 
 * al nuevo formato de múltiples entidades comerciales
 * Versión para emulador local de Firebase
 * 
 * FASE 1: Estructura de Datos - Script de Migración (Local)
 */

const admin = require('firebase-admin');

// Configurar para usar el emulador local
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Inicializar Firebase con configuración para emulador
try {
  admin.initializeApp({
    projectId: 'demo-test-project', // Proyecto demo para emulador
  });
  console.log('✅ Firebase inicializado para emulador local');
} catch (e) {
  console.log('Firebase ya inicializado');
}

const db = admin.firestore();

/**
 * Crea datos de prueba iniciales
 */
async function createInitialTestData() {
  console.log('🛠️ Creando datos de prueba iniciales...');
  
  try {
    // Crear algunos negocios con estructura antigua para migrar
    const businessesToCreate = [
      {
        id: 'la-baguette',
        name: 'La Baguette',
        businessName: 'CORPORACION BAGUETERA S.A.C.',
        ruc: '20504680623',
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
        }
      },
      {
        id: 'starbucks-test',
        name: 'Starbucks Test',
        businessName: 'STARBUCKS COFFEE PERU S.A.C.',
        ruc: '20123456789',
        address: 'Av. Javier Prado 123',
        city: 'Lima',
        active: true,
        config: {
          purchasesRequired: 8,
          timeLimit: 30,
          expirationDays: 60,
          icon: '☕',
          backgroundColor: '#00704A',
          reward: 'Bebida gratis'
        }
      },
      {
        id: 'restaurant-test',
        name: 'Restaurant Test',
        businessName: 'RESTAURANT DEMO S.A.C.',
        ruc: '20987654321',
        address: 'Av. Lima 456',
        city: 'Lima',
        active: true,
        config: {
          purchasesRequired: 5,
          timeLimit: 30,
          expirationDays: 45,
          icon: '🍽️',
          backgroundColor: '#E74C3C',
          reward: 'Descuento 20%'
        }
      }
    ];
    
    // Crear los negocios
    for (const business of businessesToCreate) {
      const businessId = business.id;
      delete business.id;
      
      await db.collection('businesses').doc(businessId).set({
        ...business,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Crear mapeo RUC básico
      await db.collection('ruc_business_map').doc(business.ruc).set({
        businessSlug: businessId
      });
      
      console.log(`   ✅ Negocio creado: ${businessId} (RUC: ${business.ruc})`);
    }
    
    console.log('✅ Datos de prueba iniciales creados');
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
    throw error;
  }
}

/**
 * Migra todos los negocios al nuevo formato de entidades múltiples
 */
async function migrateBusinessesToMultipleEntities() {
  console.log('🚀 Iniciando migración a múltiples entidades comerciales...');
  
  try {
    // Obtener todos los negocios
    const businessesSnapshot = await db.collection('businesses').get();
    console.log(`📊 Encontrados ${businessesSnapshot.size} negocios para migrar`);
    
    let processedCount = 0;
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const businessDoc of businessesSnapshot.docs) {
      const businessSlug = businessDoc.id;
      const businessData = businessDoc.data();
      
      processedCount++;
      console.log(`\n📋 Procesando negocio ${processedCount}/${businessesSnapshot.size}: ${businessSlug}`);
      console.log(`   Nombre: ${businessData.name || 'Sin nombre'}`);
      
      // Verificar si ya tiene el nuevo formato
      if (businessData.businessEntities && Array.isArray(businessData.businessEntities)) {
        console.log(`   ⚠️ Ya tiene formato de múltiples entidades, saltando...`);
        skippedCount++;
        continue;
      }
      
      // Verificar si tiene los datos necesarios para la migración
      if (!businessData.ruc || !businessData.businessName) {
        console.log(`   ⚠️ Falta RUC o razón social, saltando...`);
        skippedCount++;
        continue;
      }
      
      // Crear la entidad principal basada en los datos actuales
      const primaryEntity = {
        id: 'primary',
        businessName: businessData.businessName,
        ruc: businessData.ruc,
        address: businessData.address || 'Dirección no especificada',
        locations: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        migratedFrom: 'legacy_structure'
      };
      
      // Agregar ubicaciones si están disponibles
      if (businessData.city) {
        primaryEntity.locations.push(businessData.city);
      }
      
      // Preparar datos actualizados
      const updatedBusinessData = {
        businessEntities: [primaryEntity],
        // Mantener campos existentes por compatibilidad hacia atrás
        ruc: businessData.ruc, // RUC principal
        businessName: businessData.businessName, // Razón social principal
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Actualizar el documento
      await db.collection('businesses').doc(businessSlug).update(updatedBusinessData);
      
      console.log(`   ✅ Migrado a formato de múltiples entidades`);
      migratedCount++;
    }
    
    console.log('\n📊 Resumen de migración:');
    console.log(`   - Negocios procesados: ${processedCount}`);
    console.log(`   - Negocios migrados: ${migratedCount}`);
    console.log(`   - Negocios saltados: ${skippedCount}`);
    
    // Verificar migración
    await verifyMigration();
    
    console.log('\n✅ Migración a múltiples entidades completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

/**
 * Verifica que la migración se haya completado correctamente
 */
async function verifyMigration() {
  console.log('\n🔍 Verificando migración...');
  
  try {
    // Contar negocios con el nuevo formato
    const businessesWithEntitiesSnapshot = await db
      .collection('businesses')
      .where('businessEntities', '!=', null)
      .get();
    
    console.log(`📈 Negocios con formato de múltiples entidades: ${businessesWithEntitiesSnapshot.size}`);
    
    // Verificar algunos casos específicos
    let validationErrors = 0;
    
    for (const businessDoc of businessesWithEntitiesSnapshot.docs) {
      const businessData = businessDoc.data();
      const businessSlug = businessDoc.id;
      
      // Verificar que businessEntities sea un array
      if (!Array.isArray(businessData.businessEntities)) {
        console.error(`❌ ${businessSlug}: businessEntities no es un array`);
        validationErrors++;
        continue;
      }
      
      // Verificar que tenga al menos una entidad
      if (businessData.businessEntities.length === 0) {
        console.error(`❌ ${businessSlug}: businessEntities está vacío`);
        validationErrors++;
        continue;
      }
      
      // Verificar campos obligatorios en la primera entidad
      const primaryEntity = businessData.businessEntities[0];
      const requiredFields = ['id', 'businessName', 'ruc', 'address'];
      
      for (const field of requiredFields) {
        if (!primaryEntity[field]) {
          console.error(`❌ ${businessSlug}: Falta campo '${field}' en entidad primaria`);
          validationErrors++;
        }
      }
    }
    
    if (validationErrors === 0) {
      console.log('✅ Verificación exitosa: todos los negocios tienen formato válido');
    } else {
      console.error(`❌ Se encontraron ${validationErrors} errores de validación`);
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

/**
 * Actualiza el ruc_business_map para incluir entityId
 */
async function updateRucBusinessMap() {
  console.log('\n🗺️ Actualizando ruc_business_map...');
  
  try {
    // Obtener todos los mapeos existentes
    const rucMapSnapshot = await db.collection('ruc_business_map').get();
    console.log(`📋 Encontrados ${rucMapSnapshot.size} mapeos de RUC`);
    
    let updatedCount = 0;
    
    for (const mapDoc of rucMapSnapshot.docs) {
      const ruc = mapDoc.id;
      const mapData = mapDoc.data();
      
      // Si ya tiene entityId, saltar
      if (mapData.entityId) {
        continue;
      }
      
      // Obtener el negocio para verificar si tiene entidades
      const businessRef = db.collection('businesses').doc(mapData.businessSlug);
      const businessDoc = await businessRef.get();
      
      if (!businessDoc.exists) {
        console.warn(`⚠️ Negocio no encontrado: ${mapData.businessSlug}`);
        continue;
      }
      
      const businessData = businessDoc.data();
      
      // Si el negocio tiene entidades y el RUC coincide con la entidad primaria
      if (businessData.businessEntities && businessData.businessEntities.length > 0) {
        const primaryEntity = businessData.businessEntities[0];
        
        if (primaryEntity.ruc === ruc) {
          // Actualizar el mapeo para incluir entityId
          await mapDoc.ref.update({
            entityId: primaryEntity.id
          });
          
          updatedCount++;
        }
      }
    }
    
    console.log(`✅ Actualizados ${updatedCount} mapeos de RUC`);
    
  } catch (error) {
    console.error('❌ Error actualizando ruc_business_map:', error);
  }
}

/**
 * Crea un negocio de ejemplo con múltiples entidades para testing
 */
async function createSampleMultiEntityBusiness() {
  console.log('\n🧪 Creando negocio de ejemplo con múltiples entidades...');
  
  try {
    const sampleBusinessSlug = 'mcdonalds-sample';
    
    const sampleBusiness = {
      name: "McDonald's (Sample)",
      description: "Cadena de restaurantes de comida rápida",
      active: true,
      businessEntities: [
        {
          id: 'entity1',
          businessName: "McDonald's Peru S.A.C.",
          ruc: '20999888777',
          address: 'Av. Javier Prado 123, San Isidro',
          locations: ['Local Centro', 'Local San Isidro'],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'entity2',
          businessName: 'Arcos Dorados Restaurantes S.A.C.',
          ruc: '20777666555',
          address: 'Av. Larco 456, Miraflores',
          locations: ['Local Miraflores', 'Local Surco'],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }
      ],
      // Campos de compatibilidad (primer entity)
      ruc: '20999888777',
      businessName: "McDonald's Peru S.A.C.",
      config: {
        purchasesRequired: 10,
        timeLimit: 30,
        expirationDays: 90,
        icon: '🍔',
        backgroundColor: '#FFC72C',
        reward: 'Big Mac gratis'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Crear el negocio
    await db.collection('businesses').doc(sampleBusinessSlug).set(sampleBusiness);
    
    // Crear mapeos en ruc_business_map
    const rucMappings = [
      { ruc: '20999888777', businessSlug: sampleBusinessSlug, entityId: 'entity1' },
      { ruc: '20777666555', businessSlug: sampleBusinessSlug, entityId: 'entity2' }
    ];
    
    for (const mapping of rucMappings) {
      await db.collection('ruc_business_map').doc(mapping.ruc).set(mapping);
    }
    
    console.log(`✅ Negocio de ejemplo creado: ${sampleBusinessSlug}`);
    console.log('   - Entidad 1: McDonald\'s Peru S.A.C. (RUC: 20999888777)');
    console.log('   - Entidad 2: Arcos Dorados Restaurantes S.A.C. (RUC: 20777666555)');
    
  } catch (error) {
    console.error('❌ Error creando negocio de ejemplo:', error);
  }
}

/**
 * Función principal que ejecuta toda la migración
 */
async function runMigration() {
  try {
    console.log('🚀 MIGRACIÓN LOCAL - FASE 1: Múltiples Entidades Comerciales');
    console.log('⚠️  Asegúrate de que el emulador de Firebase esté ejecutándose:');
    console.log('   firebase emulators:start --only firestore');
    console.log('='.repeat(70));
    
    // 1. Crear datos de prueba iniciales
    await createInitialTestData();
    
    // 2. Migrar negocios existentes
    await migrateBusinessesToMultipleEntities();
    
    // 3. Actualizar ruc_business_map
    await updateRucBusinessMap();
    
    // 4. Crear negocio de ejemplo para testing
    await createSampleMultiEntityBusiness();
    
    console.log('\n🎉 Migración local FASE 1 completada exitosamente');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Ejecutar tests: npm run test:entities:local');
    console.log('   2. Verificar que todo funcione correctamente');
    console.log('   3. Proceder con FASE 2: Procesamiento de Compras');
    
  } catch (error) {
    console.error('💥 Error en la migración local FASE 1:', error);
    process.exit(1);
  }
}

// Ejecutar migración si este archivo se ejecuta directamente
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = {
  createInitialTestData,
  migrateBusinessesToMultipleEntities,
  updateRucBusinessMap,
  createSampleMultiEntityBusiness,
  runMigration
};
