# FASE 5: Testing y Validación Final

## 🎯 OBJETIVO
Realizar testing integral del sistema de múltiples entidades comerciales, validar que todas las funcionalidades trabajen correctamente y asegurar que no se hayan introducido regresiones en el sistema existente.

## 📋 CONTEXTO
Esta fase final se enfoca en:

- Testing de integración completa del flujo de múltiples entidades
- Validación de compatibilidad con negocios existentes
- Testing de rendimiento con múltiples entidades
- Validación de la experiencia de usuario end-to-end
- Verificación de que todos los casos edge están cubiertos

### Áreas de Testing:
1. **Backend** - Funciones de Firestore y procesamiento
2. **Frontend** - Componentes y flujos de usuario
3. **Integración** - Flujo completo desde WhatsApp hasta dashboard
4. **Performance** - Optimización con múltiples entidades
5. **Compatibilidad** - Negocios legacy funcionando correctamente

## 🔧 PLAN DE TESTING

### 1. Testing de Backend (Cloud Functions)

#### **Test Suite: firestoreService.js**
```javascript
// tests/backend/firestoreService.test.js
describe('FirestoreService - Multiple Entities', () => {
  describe('findBusinessByRUC', () => {
    test('should find correct entity by RUC', async () => {
      // Setup: Business with multiple entities
      const business = await createTestBusiness({
        slug: 'test-business',
        businessEntities: [
          { id: 'entity1', ruc: '20123456789', businessName: 'Entity 1' },
          { id: 'entity2', ruc: '20987654321', businessName: 'Entity 2' }
        ]
      })
      
      // Test: Find by specific RUC
      const result = await findBusinessByRUC('20987654321')
      
      expect(result.entityId).toBe('entity2')
      expect(result.entity.businessName).toBe('Entity 2')
    })
    
    test('should return null for non-existent RUC', async () => {
      const result = await findBusinessByRUC('99999999999')
      expect(result).toBeNull()
    })
  })
  
  describe('registerPurchase', () => {
    test('should register purchase with correct entity information', async () => {
      const result = await registerPurchase(
        'test-business',
        '+51987654321',
        25.50,
        'image-url',
        {
          entityId: 'entity1',
          entity: { 
            businessName: 'Entity 1',
            address: 'Address 1',
            ruc: '20123456789'
          },
          ruc: '20123456789',
          invoiceNumber: 'B001-000001'
        }
      )
      
      expect(result.success).toBe(true)
      
      // Verify in customers collection
      const customer = await getCustomer('+51987654321')
      const lastPurchase = customer.businesses['test-business'].purchases[0]
      expect(lastPurchase.entityId).toBe('entity1')
      expect(lastPurchase.businessName).toBe('Entity 1')
    })
  })
  
  describe('isDuplicateReceipt', () => {
    test('should detect duplicate within same entity', async () => {
      // First purchase
      await registerPurchase('test-business', '+51987654321', 25.50, 'url', {
        entityId: 'entity1',
        ruc: '20123456789',
        invoiceNumber: 'B001-000001'
      })
      
      // Duplicate attempt
      const isDuplicate = await isDuplicateReceipt(
        'test-business',
        '+51987654321',
        25.50,
        'url',
        { ruc: '20123456789', invoiceNumber: 'B001-000001' }
      )
      
      expect(isDuplicate).toBe(true)
    })
    
    test('should allow same invoice number from different entities', async () => {
      // Purchase from entity1
      await registerPurchase('test-business', '+51987654321', 25.50, 'url', {
        entityId: 'entity1',
        ruc: '20123456789',
        invoiceNumber: 'B001-000001'
      })
      
      // Same invoice number but from entity2
      const isDuplicate = await isDuplicateReceipt(
        'test-business',
        '+51987654321',
        25.50,
        'url',
        { ruc: '20987654321', invoiceNumber: 'B001-000001' }
      )
      
      expect(isDuplicate).toBe(false)
    })
  })
})
```

#### **Test Suite: processMessages.js**
```javascript
// tests/backend/processMessages.test.js
describe('WhatsApp Message Processing - Multiple Entities', () => {
  test('should process image and register with correct entity', async () => {
    // Mock Vision API response
    const mockExtractedData = {
      ruc: '20123456789',
      amount: 25.50,
      businessName: 'Entity 1',
      invoiceId: 'B001-000001'
    }
    
    // Mock user
    const mockUser = {
      phone: '+51987654321',
      name: 'Test User'
    }
    
    // Process message
    await processImageMessage(
      { image: { id: 'test-image-id' } },
      mockUser,
      'phone-number-id',
      'api-token'
    )
    
    // Verify purchase was registered with correct entity
    const customer = await getCustomer('+51987654321')
    const purchase = customer.businesses['test-business'].purchases[0]
    
    expect(purchase.entityId).toBe('entity1')
    expect(purchase.businessName).toBe('Entity 1')
    expect(purchase.ruc).toBe('20123456789')
  })
})
```

### 2. Testing de Frontend (Componentes Vue)

#### **Test Suite: BusinessEntitiesManager.vue**
```javascript
// tests/frontend/BusinessEntitiesManager.test.js
import { mount } from '@vue/test-utils'
import BusinessEntitiesManager from '@/components/business/BusinessEntitiesManager.vue'

describe('BusinessEntitiesManager', () => {
  test('should display existing entities', () => {
    const entities = [
      { id: 'entity1', businessName: 'Entity 1', ruc: '20123456789' },
      { id: 'entity2', businessName: 'Entity 2', ruc: '20987654321' }
    ]
    
    const wrapper = mount(BusinessEntitiesManager, {
      props: { modelValue: entities }
    })
    
    expect(wrapper.findAll('.entity-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('Entity 1')
    expect(wrapper.text()).toContain('Entity 2')
  })
  
  test('should open modal when adding new entity', async () => {
    const wrapper = mount(BusinessEntitiesManager)
    
    await wrapper.find('.add-entity-btn').trigger('click')
    
    expect(wrapper.findComponent({ name: 'EntityModal' }).exists()).toBe(true)
  })
  
  test('should validate RUC uniqueness', async () => {
    const wrapper = mount(BusinessEntitiesManager)
    
    // Mock RUC validation
    wrapper.vm.validateRUC = vi.fn().mockResolvedValue(false)
    
    const modal = wrapper.findComponent({ name: 'EntityModal' })
    await modal.vm.$emit('save', {
      businessName: 'Test Entity',
      ruc: '20123456789', // Duplicate RUC
      address: 'Test Address'
    })
    
    expect(wrapper.vm.validateRUC).toHaveBeenCalledWith('20123456789')
  })
})
```

#### **Test Suite: EntitySelector.vue**
```javascript
// tests/frontend/EntitySelector.test.js
describe('EntitySelector', () => {
  test('should emit change event when selection changes', async () => {
    const entities = [
      { id: 'entity1', businessName: 'Entity 1' },
      { id: 'entity2', businessName: 'Entity 2' }
    ]
    
    const wrapper = mount(EntitySelector, {
      props: { entities }
    })
    
    const select = wrapper.find('select')
    await select.setValue('entity1')
    
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')[0]).toEqual(['entity1'])
  })
  
  test('should show "all entities" option by default', () => {
    const wrapper = mount(EntitySelector, {
      props: { entities: [] }
    })
    
    const options = wrapper.findAll('option')
    expect(options[0].text()).toBe('Todas las entidades')
    expect(options[0].element.value).toBe('all')
  })
})
```

### 3. Tests de Integración E2E

#### **Test Suite: Complete Flow**
```javascript
// tests/e2e/multipleEntities.test.js
describe('Multiple Entities - Complete Flow', () => {
  test('should handle complete business creation and purchase flow', async () => {
    // 1. Create business with multiple entities
    await page.goto('/admin/businesses/create')
    
    // Fill basic business info
    await page.fill('[data-testid="business-name"]', 'Test Restaurant')
    await page.fill('[data-testid="business-slug"]', 'test-restaurant')
    
    // Add first entity
    await page.click('[data-testid="add-entity-btn"]')
    await page.fill('[data-testid="entity-business-name"]', 'Restaurant Corp S.A.C.')
    await page.fill('[data-testid="entity-ruc"]', '20123456789')
    await page.fill('[data-testid="entity-address"]', 'Av. Test 123')
    await page.click('[data-testid="save-entity-btn"]')
    
    // Add second entity
    await page.click('[data-testid="add-entity-btn"]')
    await page.fill('[data-testid="entity-business-name"]', 'Restaurant Operations S.A.C.')
    await page.fill('[data-testid="entity-ruc"]', '20987654321')
    await page.fill('[data-testid="entity-address"]', 'Av. Test 456')
    await page.click('[data-testid="save-entity-btn"]')
    
    // Save business
    await page.click('[data-testid="save-business-btn"]')
    
    // 2. Simulate WhatsApp purchase processing
    // (This would involve mocking the WhatsApp webhook)
    
    // 3. Verify in dashboard
    await page.goto('/admin/businesses/test-restaurant/dashboard')
    
    // Should show entity selector
    expect(page.locator('[data-testid="entity-selector"]')).toBeVisible()
    
    // Should show metrics for all entities by default
    expect(page.locator('[data-testid="total-purchases"]')).toBeVisible()
    
    // Filter by specific entity
    await page.selectOption('[data-testid="entity-selector"]', 'entity1')
    
    // Metrics should update
    await page.waitForTimeout(1000) // Wait for metrics to update
    
    // 4. Check customer loyalty card
    await page.goto('/test-restaurant/+51987654321')
    
    // Should show consolidated purchases
    expect(page.locator('[data-testid="customer-total-purchases"]')).toBeVisible()
    
    // Should show entity details if multiple entities
    expect(page.locator('[data-testid="purchase-entity-info"]')).toBeVisible()
  })
})
```

### 4. Tests de Performance

#### **Performance Test Suite**
```javascript
// tests/performance/multipleEntities.test.js
describe('Performance - Multiple Entities', () => {
  test('should handle business with 10 entities efficiently', async () => {
    // Create business with 10 entities
    const entities = Array.from({ length: 10 }, (_, i) => ({
      id: `entity${i + 1}`,
      businessName: `Entity ${i + 1} Corp S.A.C.`,
      ruc: `2012345678${i}`,
      address: `Address ${i + 1}`
    }))
    
    const startTime = performance.now()
    
    // Create business
    await createBusiness({
      slug: 'performance-test',
      businessEntities: entities
    })
    
    const endTime = performance.now()
    
    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max
  })
  
  test('should load dashboard efficiently with multiple entities', async () => {
    // Generate 1000 test purchases across 5 entities
    const purchases = generateTestPurchases(1000, 5)
    
    const startTime = performance.now()
    
    // Load dashboard metrics
    const metrics = await getBusinessMetrics('performance-test')
    
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(2000) // 2 seconds max
    expect(metrics.consolidated.totalPurchases).toBe(1000)
  })
})
```

### 5. Tests de Compatibilidad

#### **Legacy Compatibility Tests**
```javascript
// tests/compatibility/legacy.test.js
describe('Legacy Compatibility', () => {
  test('should handle business without businessEntities', async () => {
    // Create legacy business (old format)
    const legacyBusiness = {
      slug: 'legacy-business',
      name: 'Legacy Business',
      ruc: '20123456789',
      businessName: 'Legacy Corp S.A.C.',
      address: 'Legacy Address'
    }
    
    await createLegacyBusiness(legacyBusiness)
    
    // Should be able to find by RUC
    const result = await findBusinessByRUC('20123456789')
    
    expect(result).not.toBeNull()
    expect(result.slug).toBe('legacy-business')
    expect(result.entityId).toBeDefined() // Should auto-generate
  })
  
  test('should migrate legacy business on first edit', async () => {
    // Load legacy business in frontend
    const business = await loadBusiness('legacy-business')
    
    // Should auto-migrate to new format
    expect(business.businessEntities).toBeDefined()
    expect(business.businessEntities).toHaveLength(1)
    expect(business.businessEntities[0].ruc).toBe('20123456789')
  })
  
  test('should maintain legacy fields for compatibility', async () => {
    const business = await loadBusiness('legacy-business')
    
    // Legacy fields should still exist
    expect(business.ruc).toBe('20123456789')
    expect(business.businessName).toBe('Legacy Corp S.A.C.')
    expect(business.address).toBe('Legacy Address')
  })
})
```

## 📋 CASOS DE PRUEBA MANUALES

### Caso 1: Creación de Negocio con Múltiples Entidades
**Pasos:**
1. Ir a "Crear Negocio"
2. Llenar información básica
3. Agregar primera entidad comercial
4. Agregar segunda entidad con RUC diferente
5. Intentar agregar tercera entidad con RUC duplicado
6. Guardar negocio

**Resultado Esperado:**
- Negocio se crea exitosamente
- Error de validación en RUC duplicado
- Campos legacy se llenan automáticamente

### Caso 2: Procesamiento de Comprobante
**Pasos:**
1. Enviar imagen de comprobante vía WhatsApp
2. Verificar que se extrae RUC correcto
3. Confirmar que se asocia con entidad correcta
4. Verificar mensaje de confirmación

**Resultado Esperado:**
- Comprobante se procesa exitosamente
- Se asocia con entidad correcta por RUC
- Mensaje muestra razón social específica

### Caso 3: Dashboard con Filtros
**Pasos:**
1. Ir al dashboard del negocio
2. Verificar métricas consolidadas
3. Filtrar por entidad específica
4. Verificar cambio en métricas
5. Ver tabla de compras

**Resultado Esperado:**
- Métricas cambian al filtrar
- Tabla muestra solo compras de entidad filtrada
- Performance aceptable

### Caso 4: Tarjeta de Fidelidad
**Pasos:**
1. Abrir tarjeta de cliente con compras de múltiples entidades
2. Verificar total consolidado
3. Ver historial detallado
4. Confirmar información de entidades

**Resultado Esperado:**
- Totales incluyen todas las entidades
- Historial distingue entre entidades
- UX clara y no confusa

## 🔧 HERRAMIENTAS DE TESTING

### Backend Testing
```bash
# Jest para Cloud Functions
npm install --save-dev jest @types/jest
npm install --save-dev firebase-functions-test

# Configuración en package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Frontend Testing
```bash
# Vitest + Vue Test Utils
npm install --save-dev vitest @vue/test-utils
npm install --save-dev jsdom

# E2E con Playwright
npm install --save-dev @playwright/test
```

### Performance Testing
```bash
# Lighthouse CI
npm install --save-dev @lhci/cli

# Artillery para load testing
npm install --save-dev artillery
```

## 📊 MÉTRICAS DE CALIDAD

### Cobertura de Código
- **Backend:** Mínimo 80% de cobertura
- **Frontend:** Mínimo 70% de cobertura
- **Funciones críticas:** 100% de cobertura

### Performance Benchmarks
- **Creación de negocio:** < 3 segundos
- **Carga de dashboard:** < 2 segundos
- **Procesamiento de comprobante:** < 30 segundos
- **Búsqueda por RUC:** < 500ms

### Compatibilidad
- **Negocios legacy:** 100% funcionales
- **Migración automática:** Sin errores
- **Regresiones:** 0 detectadas

## ✅ CRITERIOS DE ACEPTACIÓN FINAL

### Funcionalidad
- [ ] Todos los tests unitarios pasan
- [ ] Tests de integración exitosos
- [ ] Tests E2E completos
- [ ] Performance dentro de benchmarks
- [ ] Compatibilidad legacy verificada

### Calidad
- [ ] Cobertura de código alcanzada
- [ ] No regresiones detectadas
- [ ] Validaciones funcionando correctamente
- [ ] Manejo de errores robusto

### Experiencia de Usuario
- [ ] Flujos intuitivos y claros
- [ ] Información mostrada correctamente
- [ ] Mensajes de error útiles
- [ ] Performance aceptable

### Documentación
- [ ] Documentación técnica actualizada
- [ ] Guías de usuario creadas
- [ ] Casos de uso documentados
- [ ] Troubleshooting disponible

## 📋 CHECKLIST DE DESPLIEGUE

### Pre-despliegue
- [ ] Todos los tests pasan
- [ ] Code review completado
- [ ] Documentación actualizada
- [ ] Variables de entorno configuradas

### Despliegue
- [ ] Base de datos respaldada
- [ ] Despliegue en staging exitoso
- [ ] Validación en staging
- [ ] Despliegue en producción
- [ ] Verificación post-despliegue

### Post-despliegue
- [ ] Monitoreo activo
- [ ] Tests de smoke exitosos
- [ ] Métricas de performance normales
- [ ] Sin errores reportados

## 🎉 ENTREGABLES FINALES

1. **Suite de Tests Completa**
   - Tests unitarios para todas las funciones
   - Tests de integración
   - Tests E2E automatizados

2. **Documentación**
   - Guía de implementación
   - Manual de usuario
   - Documentación técnica

3. **Scripts de Utilidad**
   - Script de migración (si necesario)
   - Script de validación de datos
   - Script de performance testing

4. **Reportes**
   - Reporte de cobertura de código
   - Reporte de performance
   - Reporte de compatibilidad

5. **Sistema Funcionando**
   - Todas las fases implementadas
   - Testing completo exitoso
   - Lista para producción

Al completar esta fase, el sistema de múltiples entidades comerciales estará completamente implementado, testado y listo para uso en producción.
