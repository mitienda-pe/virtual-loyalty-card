# FASE 3: Frontend - Gestión de Negocios

## 🎯 OBJETIVO
Crear la interfaz de usuario para gestionar múltiples entidades comerciales por negocio, permitiendo agregar, editar y eliminar razones sociales con sus respectivos RUCs y direcciones.

## 📋 CONTEXTO
Necesitamos modificar los formularios de creación y edición de negocios para soportar la gestión de múltiples entidades comerciales. Los administradores deben poder:

- Ver todas las entidades de un negocio
- Agregar nuevas entidades (razón social + RUC + dirección)
- Editar entidades existentes
- Eliminar entidades (con validaciones)
- Validar RUCs únicos en tiempo real

### Estado Actual:
- Formulario simple con un solo RUC y razón social
- Campos: `name`, `ruc`, `businessName`, `address`

### Estado Objetivo:
- Sección para gestionar múltiples entidades
- Cada entidad: `businessName`, `ruc`, `address`, `locations[]`
- Validaciones en tiempo real
- Interfaz intuitiva para CRUD de entidades

## 🔧 TAREAS A REALIZAR

### 1. Crear Componente BusinessEntitiesManager
**Archivo:** `src/components/business/BusinessEntitiesManager.vue`

```vue
<template>
  <div class="business-entities-manager">
    <div class="header">
      <h3>Entidades Comerciales</h3>
      <p class="text-sm text-gray-600">
        Gestiona las diferentes razones sociales que emiten comprobantes para este negocio
      </p>
    </div>

    <!-- Lista de entidades existentes -->
    <div class="entities-list">
      <EntityCard 
        v-for="entity in entities" 
        :key="entity.id"
        :entity="entity"
        :is-primary="entity.id === primaryEntityId"
        @edit="editEntity"
        @delete="deleteEntity"
      />
    </div>

    <!-- Botón agregar nueva entidad -->
    <button @click="showAddForm = true" class="add-entity-btn">
      <Plus class="w-4 h-4" />
      Agregar Entidad Comercial
    </button>

    <!-- Modal para agregar/editar entidad -->
    <EntityModal
      v-if="showModal"
      :entity="selectedEntity"
      :is-editing="isEditing"
      @save="saveEntity"
      @cancel="closeModal"
    />
  </div>
</template>
```

**Funcionalidades:**
- [ ] Listar entidades existentes con indicador de "principal"
- [ ] Agregar nueva entidad con validación
- [ ] Editar entidad existente
- [ ] Eliminar entidad (validar que no sea la única)
- [ ] Validación de RUC único en tiempo real
- [ ] Indicador visual de entidad principal

### 2. Crear Componente EntityCard
**Archivo:** `src/components/business/EntityCard.vue`

```vue
<template>
  <div class="entity-card" :class="{ 'primary': isPrimary }">
    <div class="entity-info">
      <div class="entity-header">
        <h4>{{ entity.businessName }}</h4>
        <span v-if="isPrimary" class="primary-badge">Principal</span>
      </div>
      <p class="ruc">RUC: {{ entity.ruc }}</p>
      <p class="address">{{ entity.address }}</p>
      <div v-if="entity.locations?.length" class="locations">
        <span class="location-tag" v-for="location in entity.locations" :key="location">
          {{ location }}
        </span>
      </div>
    </div>
    
    <div class="entity-actions">
      <button @click="$emit('edit', entity)" class="edit-btn">
        <Edit class="w-4 h-4" />
      </button>
      <button 
        @click="$emit('delete', entity)" 
        class="delete-btn"
        :disabled="isPrimary && isOnlyEntity"
      >
        <Trash class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
```

### 3. Crear Componente EntityModal
**Archivo:** `src/components/business/EntityModal.vue`

```vue
<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <h3>{{ isEditing ? 'Editar' : 'Agregar' }} Entidad Comercial</h3>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Razón Social *</label>
          <input 
            v-model="form.businessName" 
            type="text" 
            required
            placeholder="Ej: McDonald's Peru S.A.C."
          />
        </div>

        <div class="form-group">
          <label>RUC *</label>
          <input 
            v-model="form.ruc" 
            type="text" 
            required
            pattern="[0-9]{11}"
            maxlength="11"
            placeholder="20123456789"
            @blur="validateRUC"
          />
          <span v-if="rucError" class="error">{{ rucError }}</span>
        </div>

        <div class="form-group">
          <label>Dirección *</label>
          <input 
            v-model="form.address" 
            type="text" 
            required
            placeholder="Av. Javier Prado 123, San Isidro"
          />
        </div>

        <div class="form-group">
          <label>Ubicaciones/Locales</label>
          <LocationsInput v-model="form.locations" />
        </div>

        <div class="modal-actions">
          <button type="button" @click="$emit('cancel')">Cancelar</button>
          <button type="submit" :disabled="!isFormValid">
            {{ isEditing ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
```

**Funcionalidades:**
- [ ] Validación de RUC (11 dígitos, único)
- [ ] Validación de campos requeridos
- [ ] Auto-generación de ID para nuevas entidades
- [ ] Gestión de ubicaciones/locales múltiples

### 4. Crear Componente LocationsInput
**Archivo:** `src/components/business/LocationsInput.vue`

```vue
<template>
  <div class="locations-input">
    <div class="location-tags">
      <span 
        v-for="(location, index) in modelValue" 
        :key="index"
        class="location-tag"
      >
        {{ location }}
        <button @click="removeLocation(index)" type="button">×</button>
      </span>
    </div>
    
    <div class="add-location">
      <input 
        v-model="newLocation"
        @keydown.enter.prevent="addLocation"
        type="text"
        placeholder="Agregar ubicación..."
      />
      <button @click="addLocation" type="button">Agregar</button>
    </div>
  </div>
</template>
```

### 5. Actualizar CreateBusiness.vue
**Archivo:** `src/views/admin/CreateBusiness.vue`

```vue
<template>
  <div class="create-business">
    <!-- Información básica del negocio -->
    <section class="basic-info">
      <h2>Información Básica</h2>
      <!-- Campos existentes: name, slug, description, etc. -->
    </section>

    <!-- Nueva sección: Entidades Comerciales -->
    <section class="business-entities">
      <h2>Entidades Comerciales</h2>
      <p class="section-description">
        Define las razones sociales que emitirán comprobantes para este negocio.
        Debe haber al menos una entidad principal.
      </p>
      
      <BusinessEntitiesManager 
        v-model="form.businessEntities"
        @validate="validateEntities"
      />
    </section>

    <!-- Resto de secciones: configuración, etc. -->
  </div>
</template>
```

**Cambios necesarios:**
- [ ] Integrar `BusinessEntitiesManager` en el formulario
- [ ] Validar que hay al menos una entidad antes de enviar
- [ ] Actualizar lógica de envío para incluir entidades
- [ ] Mantener compatibilidad con campos legacy (`ruc`, `businessName`)

### 6. Actualizar EditBusiness.vue
**Archivo:** `src/views/admin/EditBusiness.vue`

Mismos cambios que `CreateBusiness.vue` pero para edición:
- [ ] Cargar entidades existentes
- [ ] Permitir edición de entidades
- [ ] Validar cambios antes de guardar
- [ ] Manejar caso de negocios legacy (sin `businessEntities`)

### 7. Servicios y Composables

#### **businessService.js**
```javascript
// Nuevas funciones para entidades
export const businessEntitiesService = {
  async addEntity(businessSlug, entityData) {
    // Validar RUC único
    // Generar ID único
    // Actualizar businessEntities array
  },

  async updateEntity(businessSlug, entityId, entityData) {
    // Validar RUC único (excluyendo la entidad actual)
    // Actualizar entidad específica
  },

  async deleteEntity(businessSlug, entityId) {
    // Validar que no es la única entidad
    // Eliminar entidad del array
    // Actualizar entidad principal si es necesario
  },

  async validateUniqueRUC(ruc, excludeBusinessSlug, excludeEntityId) {
    // Verificar que RUC no existe en ninguna otra entidad
  }
}
```

#### **useBusinessEntities.js**
```javascript
export function useBusinessEntities() {
  const entities = ref([])
  const loading = ref(false)
  const error = ref(null)

  const addEntity = async (businessSlug, entityData) => {
    // Lógica para agregar entidad
  }

  const updateEntity = async (businessSlug, entityId, entityData) => {
    // Lógica para actualizar entidad
  }

  const deleteEntity = async (businessSlug, entityId) => {
    // Lógica para eliminar entidad
  }

  const validateRUC = async (ruc, excludes = {}) => {
    // Validación de RUC único
  }

  return {
    entities,
    loading,
    error,
    addEntity,
    updateEntity,
    deleteEntity,
    validateRUC
  }
}
```

## 📝 CRITERIOS DE ACEPTACIÓN

✅ **Gestión Completa de Entidades:**
- Se pueden agregar nuevas entidades comerciales
- Se pueden editar entidades existentes
- Se pueden eliminar entidades (excepto si es la única)

✅ **Validaciones:**
- RUC debe ser único a nivel global
- Campos obligatorios validados
- Al menos una entidad por negocio

✅ **Experiencia de Usuario:**
- Interfaz intuitiva y fácil de usar
- Feedback visual para validaciones
- Indicador claro de entidad principal

✅ **Compatibilidad:**
- Negocios existentes se migran automáticamente
- Campos legacy se mantienen actualizados

✅ **Responsividad:**
- Funciona en desktop y mobile
- Modales y formularios adaptables

## 🧪 CASOS DE PRUEBA

### Caso 1: Crear Negocio con Una Entidad
- Usuario crea negocio con información básica
- Agrega primera entidad comercial
- Sistema la marca como principal automáticamente
- Se crean campos legacy automáticamente

### Caso 2: Agregar Segunda Entidad
- Usuario edita negocio existente
- Agrega nueva entidad con RUC diferente
- Sistema valida RUC único
- Se actualiza sin afectar entidad principal

### Caso 3: Validación de RUC Duplicado
- Usuario intenta agregar entidad con RUC existente
- Sistema muestra error en tiempo real
- No permite guardar hasta corregir

### Caso 4: Eliminar Entidad
- Usuario puede eliminar entidades secundarias
- No puede eliminar si es la única entidad
- Si elimina entidad principal, se asigna nueva principal

### Caso 5: Editar Entidad Principal
- Usuario edita datos de entidad principal
- Campos legacy se actualizan automáticamente
- Mantenimiento de compatibilidad

## 📁 ARCHIVOS A CREAR/MODIFICAR

### Nuevos Archivos:
1. `src/components/business/BusinessEntitiesManager.vue`
2. `src/components/business/EntityCard.vue`
3. `src/components/business/EntityModal.vue`
4. `src/components/business/LocationsInput.vue`
5. `src/composables/useBusinessEntities.js`
6. `src/services/businessEntitiesService.js`

### Archivos a Modificar:
1. `src/views/admin/CreateBusiness.vue`
2. `src/views/admin/EditBusiness.vue`
3. `src/services/businessService.js`
4. `src/stores/businessStore.js` (si existe)

## 🔄 DEPENDENCIAS
- **Requiere:** FASE 1 y FASE 2 completadas
- **Bloquea:** FASE 4 (necesita la gestión de entidades para mostrar información)

## ⚠️ CONSIDERACIONES ESPECIALES

### Migración de Negocios Existentes
Para negocios que ya existen sin `businessEntities`:
```javascript
// Auto-migración en el frontend
if (!business.businessEntities && business.ruc) {
  business.businessEntities = [{
    id: 'entity1',
    businessName: business.businessName,
    ruc: business.ruc,
    address: business.address,
    locations: []
  }]
}
```

### Campos Legacy
Mantener sincronizados los campos legacy:
```javascript
// Al actualizar entidades, actualizar campos legacy
business.ruc = business.businessEntities[0].ruc
business.businessName = business.businessEntities[0].businessName
business.address = business.businessEntities[0].address
```

### Validación de Formulario
```javascript
const validateBusinessForm = () => {
  // Validaciones básicas del negocio
  if (!form.name || !form.slug) return false
  
  // Validar entidades
  if (!form.businessEntities || form.businessEntities.length === 0) {
    error.value = 'Debe tener al menos una entidad comercial'
    return false
  }
  
  // Validar cada entidad
  for (const entity of form.businessEntities) {
    if (!entity.businessName || !entity.ruc || !entity.address) {
      error.value = 'Todos los campos de las entidades son obligatorios'
      return false
    }
  }
  
  return true
}
```

## 📋 CHECKLIST FINAL
- [ ] Componente BusinessEntitiesManager creado
- [ ] Componente EntityCard creado
- [ ] Componente EntityModal creado
- [ ] Componente LocationsInput creado
- [ ] Composable useBusinessEntities creado
- [ ] Servicio businessEntitiesService creado
- [ ] CreateBusiness.vue actualizado
- [ ] EditBusiness.vue actualizado
- [ ] Validaciones en tiempo real implementadas
- [ ] Compatibilidad con negocios legacy
- [ ] Responsividad verificada
- [ ] Tests de interfaz de usuario
- [ ] Documentación de componentes
