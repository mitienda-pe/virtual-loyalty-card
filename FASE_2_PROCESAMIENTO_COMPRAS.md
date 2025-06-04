# FASE 2: Procesamiento de Compras

## 🎯 OBJETIVO
Actualizar el flujo de procesamiento de compras para manejar múltiples entidades comerciales y almacenar el `entityId` correspondiente en todas las colecciones de compras.

## 📋 CONTEXTO
Con la nueva estructura de múltiples entidades por negocio, necesitamos asegurar que cada compra se asocie correctamente con la entidad específica que emitió el comprobante (basado en RUC y razón social extraídos).

### Flujo Actual:
1. WhatsApp recibe imagen de comprobante
2. Vision API extrae texto
3. Se extrae RUC y razón social
4. `findBusinessByRUC()` encuentra el negocio
5. Se registra compra con `businessSlug`

### Flujo Actualizado:
1. WhatsApp recibe imagen de comprobante
2. Vision API extrae texto
3. Se extrae RUC y razón social
4. `findBusinessByRUC()` encuentra negocio + entidad específica
5. Se registra compra con `businessSlug` + `entityId`

## 🔧 TAREAS A REALIZAR

### 1. Actualizar registerPurchase()
**Archivo:** `functions/src/services/firestoreService.js`

**Cambios necesarios:**
```javascript
// ANTES
async function registerPurchase(businessSlug, phoneNumber, amount, imageUrl, additionalData = {}) {
  // ...
}

// DESPUÉS  
async function registerPurchase(businessSlug, phoneNumber, amount, imageUrl, additionalData = {}) {
  // additionalData debe incluir: entityId, entity (objeto completo)
  const { entityId, entity } = additionalData;
  
  // Usar entity.businessName en lugar de additionalData.businessName
  // Usar entity.address en lugar de additionalData.address
  // Almacenar entityId en todos los registros
}
```

### 2. Actualizar Colecciones de Compras

#### **customers collection:**
```javascript
// En el array purchases, agregar entityId
{
  businesses: {
    "mcdonalds": {
      purchases: [
        {
          amount: 25.50,
          entityId: "entity1", // NUEVO
          ruc: "20123456789",
          businessName: "McDonald's Peru S.A.C.", // Razón social específica
          address: "Av. Javier Prado 123", // Dirección específica
          // ... resto de campos
        }
      ]
    }
  }
}
```

#### **business_invoices collection:**
```javascript
// En purchases subcollection
{
  businessSlug: "mcdonalds",
  entityId: "entity1", // NUEVO
  ruc: "20123456789",
  businessName: "McDonald's Peru S.A.C.", // Razón social específica
  address: "Av. Javier Prado 123", // Dirección específica de la entidad
  // ... resto de campos
}
```

#### **business_customers collection:**
```javascript
// En lastPurchase
{
  businessSlug: "mcdonalds",
  phoneNumber: "+51987654321",
  lastPurchase: {
    entityId: "entity1", // NUEVO
    ruc: "20123456789",
    businessName: "McDonald's Peru S.A.C.",
    // ... resto de campos
  }
}
```

### 3. Actualizar Validación de Duplicados
**Archivo:** `functions/src/services/firestoreService.js`

**isDuplicateReceipt()** debe considerar:
- RUC + número de comprobante específico de la entidad
- No solo businessSlug, sino también entityId

```javascript
// ANTES: Buscar duplicado por businessSlug + RUC + invoiceNumber
// DESPUÉS: Buscar duplicado por businessSlug + entityId + RUC + invoiceNumber
```

### 4. Actualizar Procesamiento de Mensajes
**Archivo:** `functions/src/whatsapp/processMessages.js`

**En processImageMessage():**
```javascript
// DESPUÉS de encontrar el negocio
const business = await findBusinessByRUC(extractedData.ruc);
if (!business) {
  // Error: negocio no registrado
}

// NUEVO: Usar datos de la entidad específica
const additionalData = {
  ruc: extractedData.ruc,
  invoiceNumber: extractedData.invoiceNumber,
  entityId: business.entityId, // NUEVO
  entity: business.entity, // NUEVO - objeto completo de la entidad
  businessName: business.entity.businessName, // Razón social específica
  address: business.entity.address, // Dirección específica
  customerName: user.name || "Cliente",
  verified: true,
  processedFromQueue: false,
  queueId: null,
  hasStoredImage: !!receiptImageUrl
};
```

### 5. Actualizar Cloud Tasks
**Archivo:** `functions/src/whatsapp/processImageTask.js`

Mismo cambio que en `processMessages.js` - usar `entityId` y datos específicos de la entidad.

### 6. Actualizar Queue Processor  
**Archivo:** `functions/src/whatsapp/queueProcessor.js`

Mismo cambio que en `processMessages.js` - usar `entityId` y datos específicos de la entidad.

## 📝 CRITERIOS DE ACEPTACIÓN

✅ **Asociación Correcta:**
- Cada compra se asocia con la entidad específica que emitió el comprobante
- Se almacena `entityId` en todas las colecciones relevantes

✅ **Información Específica:**
- Se usa la razón social específica de la entidad (no la genérica del negocio)
- Se usa la dirección específica de la entidad

✅ **Validación de Duplicados:**
- Los duplicados se detectan por entidad específica
- Comprobante con mismo número pero de diferentes entidades se permite

✅ **Compatibilidad:**
- Negocios con una sola entidad siguen funcionando correctamente
- Campos legacy se mantienen por compatibilidad

✅ **Mensajes WhatsApp:**
- El mensaje de confirmación muestra la razón social específica
- Se incluye la dirección específica donde se realizó la compra

## 🧪 CASOS DE PRUEBA

### Caso 1: Compra en Entidad Específica
```javascript
// Comprobante con RUC "20123456789" (entity1 de McDonald's)
// Debe registrar:
// - businessSlug: "mcdonalds"
// - entityId: "entity1" 
// - businessName: "McDonald's Peru S.A.C."
// - address: "Av. Javier Prado 123"
```

### Caso 2: Compra en Otra Entidad del Mismo Negocio
```javascript
// Comprobante con RUC "20987654321" (entity2 de McDonald's)
// Debe registrar:
// - businessSlug: "mcdonalds" (mismo negocio)
// - entityId: "entity2" (entidad diferente)
// - businessName: "Arcos Dorados Restaurantes S.A.C."
// - address: "Av. Larco 456"
```

### Caso 3: Duplicado por Entidad
```javascript
// Mismo comprobante de entity1 enviado dos veces
// Debe detectar duplicado y rechazar

// Mismo número de comprobante pero de entity2
// Debe permitir (diferentes entidades)
```

### Caso 4: Acumulación en Tarjeta
```javascript
// Compras de entity1 y entity2 del mismo negocio
// Deben acumularse en la misma tarjeta de fidelidad
// purchaseCount debe sumar ambas entidades
```

## 📁 ARCHIVOS A MODIFICAR

1. `functions/src/services/firestoreService.js`
   - `registerPurchase()`
   - `isDuplicateReceipt()`

2. `functions/src/whatsapp/processMessages.js`
   - `processImageMessage()`

3. `functions/src/whatsapp/processImageTask.js`
   - Función principal de procesamiento

4. `functions/src/whatsapp/queueProcessor.js`
   - `processQueuedImage()`

## 🔄 DEPENDENCIAS
- **Requiere:** FASE 1 completada (estructura de datos actualizada)
- **Bloquea:** FASE 3 y FASE 4 (necesitan el procesamiento actualizado)

## ⚠️ CONSIDERACIONES ESPECIALES

### Migración de Datos Existentes
Como no hay datos en producción, no necesitamos migración. Pero si hubiera datos:
- Asignar `entityId` del primer entity a compras existentes
- Actualizar `ruc_business_map` existente

### Mensajes WhatsApp Informativos
El mensaje de confirmación debe mostrar:
```
¡Gracias por tu compra en McDonald's!

🧯 Comprobante registrado correctamente
💰 Monto: S/ 25.50
🏢 Razón Social: McDonald's Peru S.A.C.
📍 Dirección: Av. Javier Prado 123

🛍️ Compra registrada exitosamente
🛒 Total de compras: 5

Ver tu tarjeta de fidelidad: https://asiduo.club/mcdonalds/+51987654321
```

## 📋 CHECKLIST FINAL
- [ ] registerPurchase() actualizada para manejar entityId
- [ ] Todas las colecciones almacenan entityId
- [ ] isDuplicateReceipt() considera entidad específica  
- [ ] Procesamiento de mensajes usa datos de entidad específica
- [ ] Cloud Tasks actualizado
- [ ] Queue Processor actualizado
- [ ] Mensajes WhatsApp muestran información específica
- [ ] Tests de integración creados
- [ ] Validación de flujo completo
