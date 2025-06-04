#!/usr/bin/env node

/**
 * Script de testing para validar las funciones de múltiples entidades
 * 
 * FASE 1: Tests de Validación
 */

const admin = require('firebase-admin');

// Inicializar Firebase si aún no está inicializado
try {
  admin.initializeApp({
    projectId: 'virtual-loyalty-card-e37c9'
  });
} catch (e) {
  console.log('Firebase ya inicializado');
}

const db = admin.firestore();

// Importar funciones a testear
const {
  findBusinessByRUC,
  addBusinessEntity,
  updateBusinessEntity,
  removeBusinessEntity,
  getBusinessEntity,
  getAllBusinessEntities,
  validateUniqueRUC,
  setFirestoreDb
} = require('../src/services/firestoreService');

// Establecer la instancia de Firestore
setFirestoreDb(db);

/**
 * Ejecuta todos los tests
 */
async function runAllTests() {
  console.log('🧪 INICIANDO TESTS DE FASE 1: Múltiples Entidades');
  console.log('='.repeat(60));
  
  let passedTests = 0;
  let failedTests = 0;
  
  const tests = [
    testFindBusinessByRUCCompatibility,
    testFindBusinessByRUCWithEntities,
    testAddBusinessEntity,
    testUpdateBusinessEntity,
    testValidateUniqueRUC,
    testGetBusinessEntity,
    testGetAllBusinessEntities,
    testRemoveBusinessEntity
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n🔬 Ejecutando: ${test.name}`);
      await test();
      console.log(`✅ PASADO: ${test.name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ FALLIDO: ${test.name}`);
      console.error(`   Error: ${error.message}`);
      failedTests++;
    }
  }
  
  console.log('\n📊 RESUMEN DE TESTS:');
  console.log(`   ✅ Pasados: ${passedTests}`);
  console.log(`   ❌ Fallidos: ${failedTests}`);
  console.log(`   📈 Total: ${passedTests + failedTests}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ¡Todos los tests pasaron exitosamente!');
  } else {
    console.log('\n⚠️ Algunos tests fallaron. Revisar implementación.');
  }
}

/**
 * Test: Compatibilidad hacia atrás con findBusinessByRUC
 */
async function testFindBusinessByRUCCompatibility() {
  // Buscar La Baguette (debería tener formato migrado)
  const business = await findBusinessByRUC('20504680623');
  
  if (!business) {
    throw new Error('No se encontró negocio con RUC 20504680623');
  }
  
  // Verificar campos de compatibilidad
  if (!business.slug || !business.name) {
    throw new Error('Faltan campos básicos del negocio');
  }
  
  // Si tiene entidades, verificar que tenga entityId y entity
  if (business.businessEntities && business.businessEntities.length > 0) {
    if (!business.entityId || !business.entity) {
      throw new Error('Negocio con entidades debe tener entityId y entity');
    }
    
    if (business.entity.ruc !== '20504680623') {
      throw new Error('RUC de la entidad no coincide');
    }
  }
  
  console.log(`   📋 Negocio encontrado: ${business.name}`);
  console.log(`   🆔 Entity ID: ${business.entityId || 'N/A'}`);
}

/**
 * Test: findBusinessByRUC con múltiples entidades
 */
async function testFindBusinessByRUCWithEntities() {
  // Buscar entidad específica del negocio de ejemplo
  const business1 = await findBusinessByRUC('20999888777');
  const business2 = await findBusinessByRUC('20777666555');
  
  if (!business1 || !business2) {
    throw new Error('No se encontraron las entidades del negocio de ejemplo');
  }
  
  // Ambos deberían ser del mismo negocio pero con diferentes entidades
  if (business1.slug !== business2.slug) {
    throw new Error('Las entidades deberían pertenecer al mismo negocio');
  }
  
  if (business1.entityId === business2.entityId) {
    throw new Error('Las entidades deberían tener IDs diferentes');
  }
  
  if (business1.entity.ruc === business2.entity.ruc) {
    throw new Error('Las entidades deberían tener RUCs diferentes');
  }
  
  console.log(`   🏢 Negocio: ${business1.name}`);
  console.log(`   📍 Entidad 1: ${business1.entity.businessName} (${business1.entity.ruc})`);
  console.log(`   📍 Entidad 2: ${business2.entity.businessName} (${business2.entity.ruc})`);
}

/**
 * Test: Agregar nueva entidad comercial
 */
async function testAddBusinessEntity() {
  const testBusinessSlug = 'mcdonalds-sample';
  
  const newEntityData = {
    businessName: 'McDonald\'s Norte S.A.C.',
    ruc: '20555444333',
    address: 'Av. Universitaria 1234, Los Olivos',
    locations: ['Local Los Olivos', 'Local Independencia']
  };
  
  const result = await addBusinessEntity(testBusinessSlug, newEntityData);
  
  if (!result.success) {
    throw new Error('No se pudo agregar la entidad');
  }
  
  if (!result.entityId || !result.entity) {
    throw new Error('Respuesta incompleta al agregar entidad');
  }
  
  // Verificar que se agregó correctamente
  const entity = await getBusinessEntity(testBusinessSlug, result.entityId);
  if (!entity) {
    throw new Error('Entidad agregada no se puede recuperar');
  }
  
  if (entity.ruc !== newEntityData.ruc) {
    throw new Error('RUC de la entidad agregada no coincide');
  }
  
  console.log(`   ✅ Entidad agregada: ${result.entityId}`);
  console.log(`   📋 Razón social: ${entity.businessName}`);
  
  // Limpiar después del test
  await removeBusinessEntity(testBusinessSlug, result.entityId);
}

/**
 * Test: Actualizar entidad comercial
 */
async function testUpdateBusinessEntity() {
  const testBusinessSlug = 'mcdonalds-sample';
  const entityId = 'entity1';
  
  // Obtener datos actuales
  const originalEntity = await getBusinessEntity(testBusinessSlug, entityId);
  if (!originalEntity) {
    throw new Error('Entidad de prueba no encontrada');
  }
  
  const updateData = {
    address: 'Nueva dirección de prueba 123',
    locations: ['Local Actualizado']
  };
  
  const result = await updateBusinessEntity(testBusinessSlug, entityId, updateData);
  
  if (!result.success) {
    throw new Error('No se pudo actualizar la entidad');
  }
  
  // Verificar que se actualizó
  const updatedEntity = await getBusinessEntity(testBusinessSlug, entityId);
  if (updatedEntity.address !== updateData.address) {
    throw new Error('La dirección no se actualizó correctamente');
  }
  
  console.log(`   ✅ Entidad actualizada: ${entityId}`);
  console.log(`   📍 Nueva dirección: ${updatedEntity.address}`);
  
  // Restaurar datos originales
  await updateBusinessEntity(testBusinessSlug, entityId, {
    address: originalEntity.address,
    locations: originalEntity.locations
  });
}

/**
 * Test: Validar unicidad de RUC
 */
async function testValidateUniqueRUC() {
  // RUC que sabemos que existe
  const existingRUC = '20999888777';
  const newRUC = '20111222333';
  
  // Debería retornar false para RUC existente
  const isExistingUnique = await validateUniqueRUC(existingRUC);
  if (isExistingUnique) {
    throw new Error('validateUniqueRUC debería retornar false para RUC existente');
  }
  
  // Debería retornar true para RUC nuevo
  const isNewUnique = await validateUniqueRUC(newRUC);
  if (!isNewUnique) {
    throw new Error('validateUniqueRUC debería retornar true para RUC nuevo');
  }
  
  // Debería retornar true cuando excluimos el negocio actual
  const isUniqueWithExclusion = await validateUniqueRUC(existingRUC, 'mcdonalds-sample', 'entity1');
  if (!isUniqueWithExclusion) {
    throw new Error('validateUniqueRUC debería retornar true cuando se excluye la entidad actual');
  }
  
  console.log(`   ✅ Validación de unicidad funciona correctamente`);
}

/**
 * Test: Obtener entidad específica
 */
async function testGetBusinessEntity() {
  const testBusinessSlug = 'mcdonalds-sample';
  const entityId = 'entity1';
  
  const entity = await getBusinessEntity(testBusinessSlug, entityId);
  
  if (!entity) {
    throw new Error('No se pudo obtener la entidad');
  }
  
  if (entity.id !== entityId) {
    throw new Error('ID de entidad no coincide');
  }
  
  if (!entity.businessName || !entity.ruc || !entity.address) {
    throw new Error('Faltan campos obligatorios en la entidad');
  }
  
  console.log(`   ✅ Entidad obtenida: ${entity.businessName}`);
  console.log(`   🆔 ID: ${entity.id}`);
  console.log(`   📋 RUC: ${entity.ruc}`);
}

/**
 * Test: Obtener todas las entidades de un negocio
 */
async function testGetAllBusinessEntities() {
  const testBusinessSlug = 'mcdonalds-sample';
  
  const entities = await getAllBusinessEntities(testBusinessSlug);
  
  if (!Array.isArray(entities)) {
    throw new Error('getAllBusinessEntities debe retornar un array');
  }
  
  if (entities.length < 2) {
    throw new Error('El negocio de ejemplo debería tener al menos 2 entidades');
  }
  
  // Verificar que cada entidad tenga los campos necesarios
  for (const entity of entities) {
    if (!entity.id || !entity.businessName || !entity.ruc || !entity.address) {
      throw new Error('Entidad incompleta en la lista');
    }
  }
  
  console.log(`   ✅ Obtenidas ${entities.length} entidades`);
  entities.forEach((entity, index) => {
    console.log(`   📍 ${index + 1}. ${entity.businessName} (${entity.ruc})`);
  });
}

/**
 * Test: Eliminar entidad comercial
 */
async function testRemoveBusinessEntity() {
  const testBusinessSlug = 'mcdonalds-sample';
  
  // Primero agregar una entidad temporal para eliminar
  const tempEntityData = {
    businessName: 'Entidad Temporal S.A.C.',
    ruc: '20999111222',
    address: 'Dirección temporal 123'
  };
  
  const addResult = await addBusinessEntity(testBusinessSlug, tempEntityData);
  if (!addResult.success) {
    throw new Error('No se pudo agregar entidad temporal');
  }
  
  const tempEntityId = addResult.entityId;
  
  // Verificar que existe
  let entity = await getBusinessEntity(testBusinessSlug, tempEntityId);
  if (!entity) {
    throw new Error('Entidad temporal no se encuentra después de agregarla');
  }
  
  // Eliminar la entidad
  const removeResult = await removeBusinessEntity(testBusinessSlug, tempEntityId);
  if (!removeResult.success) {
    throw new Error('No se pudo eliminar la entidad temporal');
  }
  
  // Verificar que ya no existe
  entity = await getBusinessEntity(testBusinessSlug, tempEntityId);
  if (entity) {
    throw new Error('Entidad temporal aún existe después de eliminarla');
  }
  
  console.log(`   ✅ Entidad eliminada correctamente: ${tempEntityId}`);
  console.log(`   📋 Entidad eliminada: ${removeResult.removedEntity.businessName}`);
}

/**
 * Test de integración: Flujo completo
 */
async function testCompleteWorkflow() {
  console.log('\n🔄 Ejecutando test de integración completo...');
  
  try {
    // 1. Crear un negocio de prueba
    const testBusinessSlug = 'test-integration-business';
    const testBusiness = {
      name: 'Test Integration Business',
      description: 'Negocio para testing de integración',
      active: true,
      ruc: '20123123123',
      businessName: 'Test Business S.A.C.',
      config: {
        purchasesRequired: 5,
        timeLimit: 30,
        expirationDays: 60,
        icon: '🧪',
        backgroundColor: '#FF6B6B',
        reward: 'Premio de prueba'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('businesses').doc(testBusinessSlug).set(testBusiness);
    console.log('   ✅ Negocio de prueba creado');
    
    // 2. Migrar a formato de múltiples entidades
    const primaryEntity = {
      id: 'primary',
      businessName: testBusiness.businessName,
      ruc: testBusiness.ruc,
      address: 'Dirección principal de prueba',
      locations: ['Local Principal'],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('businesses').doc(testBusinessSlug).update({
      businessEntities: [primaryEntity],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('   ✅ Negocio migrado a formato de múltiples entidades');
    
    // 3. Buscar por RUC
    const foundBusiness = await findBusinessByRUC(testBusiness.ruc);
    if (!foundBusiness || foundBusiness.slug !== testBusinessSlug) {
      throw new Error('No se pudo encontrar el negocio por RUC después de la migración');
    }
    console.log('   ✅ Negocio encontrado por RUC');
    
    // 4. Agregar segunda entidad
    const secondEntityData = {
      businessName: 'Test Business Sucursal S.A.C.',
      ruc: '20456456456',
      address: 'Dirección sucursal de prueba',
      locations: ['Local Sucursal']
    };
    
    const addResult = await addBusinessEntity(testBusinessSlug, secondEntityData);
    if (!addResult.success) {
      throw new Error('No se pudo agregar segunda entidad');
    }
    console.log('   ✅ Segunda entidad agregada');
    
    // 5. Verificar que ambas entidades se pueden encontrar por RUC
    const business1 = await findBusinessByRUC(testBusiness.ruc);
    const business2 = await findBusinessByRUC(secondEntityData.ruc);
    
    if (!business1 || !business2) {
      throw new Error('No se pudieron encontrar ambas entidades por RUC');
    }
    
    if (business1.slug !== business2.slug) {
      throw new Error('Ambas entidades deberían pertenecer al mismo negocio');
    }
    console.log('   ✅ Ambas entidades encontradas correctamente');
    
    // 6. Limpiar
    await db.collection('businesses').doc(testBusinessSlug).delete();
    await db.collection('ruc_business_map').doc(testBusiness.ruc).delete();
    await db.collection('ruc_business_map').doc(secondEntityData.ruc).delete();
    console.log('   ✅ Limpieza completada');
    
  } catch (error) {
    console.error('❌ Error en test de integración:', error);
    throw error;
  }
}

// Ejecutar tests si este archivo se ejecuta directamente
if (require.main === module) {
  runAllTests()
    .then(() => testCompleteWorkflow())
    .then(() => {
      console.log('\n🎉 ¡Todos los tests completados exitosamente!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error en los tests:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testCompleteWorkflow
};
