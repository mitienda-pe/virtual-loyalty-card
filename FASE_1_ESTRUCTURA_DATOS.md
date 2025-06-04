# FASE 1: Estructura de Datos (Backend)

## 🎯 OBJETIVO
Modificar el modelo de datos en Firestore para soportar múltiples razones sociales por negocio, manteniendo compatibilidad hacia atrás.

## 📋 CONTEXTO
Actualmente cada negocio tiene una sola razón social y RUC. Necesitamos permitir múltiples entidades comerciales (diferentes razones sociales y RUCs) bajo un mismo nombre comercial para soportar cadenas de restaurantes, franquicias, etc.

### Problema Actual:
```javascript
// businesses collection - ESTRUCTURA ACTUAL
{
  name: "McDonald's",
  ruc: "20123456789",
  businessName: "McDonald's Peru S.A.C.",
  address: "Av. Javier Prado 123",
  // ...
}
```

### Solución Propuesta:
```javascript
// businesses collection - NUEVA ESTRUCTURA
{
  name: "McDonald's", // Nombre comercial principal
  businessEntities: [
    {
      id: "entity1",
      businessName: "McDonald's Peru S.A.C.",
      ruc: "20123456789",
      address: "Av. Javier Prado 123",
      locations: ["Local Centro", "Local San Isidro"]
    },
    {
      id: "entity2", 
      businessName: "Arcos Dorados Restaurantes S.A.C.",
      ruc: "20987654321",
      address: "Av. Larco 456",
      locations: ["Local Miraflores", "Local Surco"]
    }
  ],
  // Mantener compatibilidad hacia atrás
  ruc: "20123456789", // RUC principal (primer entity)
  businessName: "McDonald's Peru S.A.C." // Razón social principal
}
```

## 🔧 TAREAS A REALIZAR

### 1. Actualizar Modelo de Businesses
**Archivo:** `functions/src/services/firestoreService.js`

- [ ] Agregar validación para `businessEntities` array
- [ ] Crear función `addBusinessEntity(businessSlug, entityData)`
- [ ] Crear función `updateBusinessEntity(businessSlug, entityId, entityData)`
- [ ] Crear función `removeBusinessEntity(businessSlug, entityId)`
- [ ] Validar RUCs únicos a nivel global en todas las entidades

### 2. Actualizar ruc_business_map
**Cambio necesario:**
```javascript
// ANTES
{
  "20123456789": { businessSlug: "mcdonalds" }
}

// DESPUÉS
{
  "20123456789": { 
    businessSlug: "mcdonalds",
    entityId: "entity1"
  },
  "20987654321": { 
    businessSlug: "mcdonalds",
    entityId: "entity2"
  }
}
```

### 3. Modificar findBusinessByRUC()
**Archivo:** `functions/src/services/firestoreService.js`

La función debe retornar:
```javascript
{
  id: "mcdonalds",
  slug: "mcdonalds",
  name: "McDonald's",
  entityId: "entity1", // NUEVO
  entity: {
    id: "entity1",
    businessName: "McDonald's Peru S.A.C.",
    ruc: "20123456789",
    address: "Av. Javier Prado 123",
    locations: ["Local Centro", "Local San Isidro"]
  },
  // ... resto de datos del negocio
}
```

### 4. Nuevas Funciones Utilitarias
**Archivo:** `functions/src/services/firestoreService.js`

- [ ] `getBusinessEntity(businessSlug, entityId)` - Obtener entidad específica
- [ ] `getAllBusinessEntities(businessSlug)` - Obtener todas las entidades de un negocio
- [ ] `validateUniqueRUC(ruc, excludeBusinessSlug?, excludeEntityId?)` - Validar RUC único
- [ ] `findEntityByRUC(ruc)` - Buscar entidad por RUC (wrapper de findBusinessByRUC)

### 5. Validaciones
- [ ] RUC debe ser único a nivel global (no puede repetirse en ninguna entidad)
- [ ] Cada entidad debe tener al menos: `businessName`, `ruc`, `address`
- [ ] `entityId` debe ser único dentro del negocio
- [ ] Array `businessEntities` no puede estar vacío

## 📝 CRITERIOS DE ACEPTACIÓN

✅ **Estructura Compatible:**
- Negocios existentes siguen funcionando sin modificación
- Campos `ruc` y `businessName` principales se mantienen por compatibilidad

✅ **Gestión de Entidades:**
- Se pueden agregar múltiples entidades a un negocio
- Se pueden editar entidades individuales
- Se pueden eliminar entidades (excepto si es la única)

✅ **Validaciones:**
- RUCs únicos a nivel global
- No se permiten entidades duplicadas
- Validación de campos obligatorios

✅ **Búsqueda:**
- `findBusinessByRUC()` retorna negocio + entidad específica
- `ruc_business_map` se actualiza correctamente

## 🧪 CASOS DE PRUEBA

### Caso 1: Negocio con Una Entidad (Compatibilidad)
```javascript
// Debe funcionar igual que antes
const business = await findBusinessByRUC("20123456789");
// Debe retornar entityId del primer (y único) entity
```

### Caso 2: Negocio con Múltiples Entidades
```javascript
// Debe retornar la entidad específica que coincide con el RUC
const business = await findBusinessByRUC("20987654321");
assert(business.entityId === "entity2");
```

### Caso 3: Validación de RUC Duplicado
```javascript
// Debe fallar al intentar agregar RUC existente
await addBusinessEntity("mcdonalds", {
  ruc: "20123456789", // Ya existe
  businessName: "Test",
  address: "Test"
});
// Debe lanzar error
```

## 📁 ARCHIVOS A MODIFICAR

1. `functions/src/services/firestoreService.js` - Lógica principal
2. `functions/src/whatsapp/processMessages.js` - Actualizar uso de findBusinessByRUC
3. `functions/src/whatsapp/processImageTask.js` - Actualizar uso de findBusinessByRUC

## 🔄 DEPENDENCIAS
- Esta fase es prerequisito para todas las demás fases
- No depende de otras fases

## 📋 CHECKLIST FINAL
- [ ] Funciones CRUD para entidades implementadas
- [ ] findBusinessByRUC() actualizada
- [ ] ruc_business_map actualizado
- [ ] Validaciones implementadas
- [ ] Tests unitarios creados
- [ ] Documentación actualizada
