<template>
  <div class="entity-selector">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      Ver métricas de:
    </label>
    <select 
      v-model="selectedValue" 
      @change="handleChange"
      class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
    >
      <option value="all">Todas las entidades (Consolidado)</option>
      <option 
        v-for="entity in entities" 
        :key="entity.id"
        :value="entity.id"
      >
        {{ entity.businessName }} ({{ entity.ruc }})
      </option>
    </select>
    
    <!-- Información de la entidad seleccionada -->
    <div v-if="selectedEntity && selectedValue !== 'all'" class="mt-2 p-2 bg-blue-50 rounded-md">
      <div class="text-sm text-blue-800">
        <div class="font-medium">{{ selectedEntity.businessName }}</div>
        <div class="text-blue-600">{{ selectedEntity.address }}</div>
        <div class="text-blue-600">RUC: {{ selectedEntity.ruc }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  entities: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: String,
    default: 'all'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const selectedValue = computed({
  get: () => props.modelValue || 'all',
  set: (value) => emit('update:modelValue', value)
})

const selectedEntity = computed(() => {
  if (!props.entities || selectedValue.value === 'all') return null
  return props.entities.find(entity => entity.id === selectedValue.value)
})

const handleChange = () => {
  emit('change', {
    entityId: selectedValue.value,
    entity: selectedEntity.value
  })
}

// Emitir cambio inicial
watch(() => props.entities, () => {
  if (props.entities?.length > 0) {
    handleChange()
  }
}, { immediate: true })
</script>

<style scoped>
.entity-selector {
  @apply w-full max-w-md;
}
</style>
