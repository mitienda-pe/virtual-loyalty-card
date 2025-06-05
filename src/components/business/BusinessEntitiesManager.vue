<template>
  <div class="business-entities-manager">
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Entidades Comerciales</h3>
      <p class="text-sm text-gray-600">
        Gestiona las diferentes razones sociales que emiten comprobantes para este negocio.
        Debe haber al menos una entidad principal.
      </p>
    </div>

    <!-- Lista de entidades existentes -->
    <div class="space-y-4 mb-6">
      <EntityCard 
        v-for="entity in entities" 
        :key="entity.id"
        :entity="entity"
        :is-primary="entity.id === primaryEntityId"
        :is-only-entity="entities.length === 1"
        @edit="editEntity"
        @delete="deleteEntity"
        @set-primary="setPrimaryEntity"
      />
    </div>

    <!-- Botón agregar nueva entidad -->
    <button 
      @click="showAddForm" 
      class="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
    >
      <Plus class="w-5 h-5" />
      Agregar Entidad Comercial
    </button>

    <!-- Modal para agregar/editar entidad -->
    <EntityModal
      v-if="showModal"
      :entity="selectedEntity"
      :is-editing="isEditing"
      :existing-rucs="getExistingRucs()"
      @save="saveEntity"
      @cancel="closeModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import EntityCard from './EntityCard.vue'
import EntityModal from './EntityModal.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  primaryEntityId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'update:primaryEntityId', 'validate'])

// Estado local
const entities = ref([...props.modelValue])
const showModal = ref(false)
const selectedEntity = ref(null)
const isEditing = ref(false)

// Computed
const primaryEntityId = computed({
  get: () => props.primaryEntityId || (entities.value.length > 0 ? entities.value[0].id : null),
  set: (value) => emit('update:primaryEntityId', value)
})

// Watchers
watch(entities, (newEntities) => {
  emit('update:modelValue', newEntities)
  validateEntities()
}, { deep: true })

watch(() => props.modelValue, (newValue) => {
  entities.value = [...newValue]
}, { deep: true })

// Métodos
const showAddForm = () => {
  selectedEntity.value = null
  isEditing.value = false
  showModal.value = true
}

const editEntity = (entity) => {
  selectedEntity.value = { ...entity }
  isEditing.value = true
  showModal.value = true
}

const deleteEntity = (entity) => {
  if (entities.value.length <= 1) {
    alert('Debe mantener al menos una entidad comercial')
    return
  }

  if (confirm(`¿Está seguro de eliminar la entidad "${entity.businessName}"?`)) {
    const index = entities.value.findIndex(e => e.id === entity.id)
    if (index !== -1) {
      entities.value.splice(index, 1)
      
      // Si eliminamos la entidad principal, asignar una nueva
      if (entity.id === primaryEntityId.value && entities.value.length > 0) {
        primaryEntityId.value = entities.value[0].id
      }
    }
  }
}

const setPrimaryEntity = (entity) => {
  primaryEntityId.value = entity.id
}

const saveEntity = (entityData) => {
  if (isEditing.value) {
    // Actualizar entidad existente
    const index = entities.value.findIndex(e => e.id === selectedEntity.value.id)
    if (index !== -1) {
      entities.value[index] = { ...entityData, id: selectedEntity.value.id }
    }
  } else {
    // Crear nueva entidad
    const newEntity = {
      ...entityData,
      id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    entities.value.push(newEntity)
    
    // Si es la primera entidad, hacerla principal
    if (entities.value.length === 1) {
      primaryEntityId.value = newEntity.id
    }
  }
  
  closeModal()
}

const closeModal = () => {
  showModal.value = false
  selectedEntity.value = null
  isEditing.value = false
}

const getExistingRucs = () => {
  return entities.value
    .filter(e => !isEditing.value || e.id !== selectedEntity.value?.id)
    .map(e => e.ruc)
}

const validateEntities = () => {
  const isValid = entities.value.length > 0 && 
                  entities.value.every(e => e.businessName && e.ruc && e.address)
  
  emit('validate', {
    isValid,
    errors: isValid ? [] : ['Debe tener al menos una entidad comercial completa']
  })
}

// Validar al montar
validateEntities()
</script>

<style scoped>
.business-entities-manager {
  @apply space-y-4;
}
</style>
