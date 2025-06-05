<template>
  <div class="locations-input">
    <!-- Tags de ubicaciones existentes -->
    <div v-if="modelValue.length > 0" class="flex flex-wrap gap-2 mb-3">
      <span 
        v-for="(location, index) in modelValue" 
        :key="index"
        class="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-full"
      >
        {{ location }}
        <button 
          @click="removeLocation(index)" 
          type="button"
          class="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <X class="w-3 h-3" />
        </button>
      </span>
    </div>
    
    <!-- Input para agregar nueva ubicación -->
    <div class="flex gap-2">
      <input 
        v-model="newLocation"
        @keydown.enter.prevent="addLocation"
        @keydown.tab="addLocation"
        type="text"
        placeholder="Agregar ubicación (ej: Mall del Sur, Centro de Lima)..."
        class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        maxlength="100"
      />
      <button 
        @click="addLocation" 
        type="button"
        :disabled="!canAddLocation"
        class="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus class="w-4 h-4" />
      </button>
    </div>
    
    <!-- Ayuda y límites -->
    <div class="mt-1 text-xs text-gray-500">
      {{ modelValue.length }}/{{ maxLocations }} ubicaciones
      <span v-if="modelValue.length === 0">
        • Presiona Enter o Tab para agregar
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { X, Plus } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  maxLocations: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['update:modelValue'])

const newLocation = ref('')

const canAddLocation = computed(() => {
  const trimmed = newLocation.value.trim()
  return trimmed.length > 0 && 
         !props.modelValue.includes(trimmed) && 
         props.modelValue.length < props.maxLocations
})

const addLocation = () => {
  const trimmed = newLocation.value.trim()
  
  if (canAddLocation.value) {
    const updated = [...props.modelValue, trimmed]
    emit('update:modelValue', updated)
    newLocation.value = ''
  }
}

const removeLocation = (index) => {
  const updated = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', updated)
}
</script>
