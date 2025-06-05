<template>
  <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="modal-header bg-blue-600 text-white p-6 rounded-t-lg">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">
            {{ isEditing ? 'Editar Programa' : 'Crear Nuevo Programa' }}
          </h2>
          <button @click="$emit('cancel')" class="text-white hover:text-gray-200">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <!-- Body -->
      <div class="modal-body p-6">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Información Básica -->
          <div class="form-section">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Información Básica</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Programa *
                </label>
                <input 
                  v-model="form.name" 
                  type="text" 
                  required 
                  placeholder="Ej: Promoción Plato del Día"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  :class="{ 'border-red-300': errors.name }"
                >
                <p v-if="errors.name" class="text-red-600 text-sm mt-1">{{ errors.name }}</p>
              </div>
              
              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Programa *
                </label>
                <select 
                  v-model="form.type" 
                  @change="resetConfig"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  :class="{ 'border-red-300': errors.type }"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="visits">Por Visitas</option>
                  <option value="specific_product">Por Producto Específico</option>
                  <option value="ticket_value">Por Valor de Ticket</option>
                  <option value="points">Por Puntos</option>
                </select>
                <p v-if="errors.type" class="text-red-600 text-sm mt-1">{{ errors.type }}</p>
              </div>
            </div>
            
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea 
                v-model="form.description" 
                rows="3"
                placeholder="Describe cómo funciona el programa..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
          </div>
          
          <!-- Configuración Específica por Tipo -->
          <div v-if="form.type" class="form-section">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Configuración del Programa</h3>
            
            <!-- Configuración para Visitas -->
            <div v-if="form.type === 'visits'" class="config-section space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Número de Visitas Requeridas *
                  </label>
                  <input 
                    v-model.number="form.config.target" 
                    type="number" 
                    min="1" 
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    :class="{ 'border-red-300': errors['config.target'] }"
                  >
                  <p v-if="errors['config.target']" class="text-red-600 text-sm mt-1">{{ errors['config.target'] }}</p>
                </div>
                
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Recompensa *
                  </label>
                  <input 
                    v-model="form.config.reward" 
                    type="text" 
                    required 
                    placeholder="Ej: Café gratis"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    :class="{ 'border-red-300': errors['config.reward'] }"
                  >
                  <p v-if="errors['config.reward']" class="text-red-600 text-sm mt-1">{{ errors['config.reward'] }}</p>
                </div>
              </div>
            </div>
            
            <!-- Configuración para Producto Específico -->
            <div v-if="form.type === 'specific_product'" class="config-section space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Número de Productos Requeridos *
                  </label>
                  <input 
                    v-model.number="form.config.target" 
                    type="number" 
                    min="1" 
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                </div>
                
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Recompensa *
                  </label>
                  <input 
                    v-model="form.config.reward" 
                    type="text" 
                    required 
                    placeholder="Ej: Postre gratis"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                </div>
              </div>
              
              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Palabras Clave del Producto *
                </label>
                <div class="space-y-2">
                  <input 
                    v-model="keywordsInput" 
                    type="text" 
                    placeholder="Ej: plato del día, especial, menú ejecutivo"
                    @keydown.enter.prevent="addKeyword"
                    @blur="addKeyword"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                  <div class="flex flex-wrap gap-2">
                    <span 
                      v-for="(keyword, index) in form.config.productKeywords" 
                      :key="index"
                      class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                    >
                      {{ keyword }}
                      <button @click="removeKeyword(index)" type="button" class="text-blue-600 hover:text-blue-800">
                        <XMarkIcon class="w-4 h-4" />
                      </button>
                    </span>
                  </div>
                  <p class="text-sm text-gray-500">Presiona Enter o haz clic fuera para agregar palabras clave</p>
                </div>
              </div>
            </div>
            
            <!-- Configuración para Valor de Ticket -->
            <div v-if="form.type === 'ticket_value'" class="config-section space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Número de Tickets Requeridos *
                  </label>
                  <input 
                    v-model.number="form.config.target" 
                    type="number" 
                    min="1" 
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                </div>
                
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Valor Mínimo del Ticket (S/) *
                  </label>
                  <input 
                    v-model.number="form.config.minTicketValue" 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                </div>
                
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Recompensa *
                  </label>
                  <input 
                    v-model="form.config.reward" 
                    type="text" 
                    required 
                    placeholder="Ej: Hamburguesa gratis"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                </div>
              </div>
            </div>
            
            <!-- Configuración para Puntos -->
            <div v-if="form.type === 'points'" class="config-section space-y-4">
              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Puntos por Cada Sol Gastado *
                </label>
                <input 
                  v-model.number="form.config.pointsPerDollar" 
                  type="number" 
                  min="0.1" 
                  step="0.1" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
              
              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Niveles de Recompensa *
                </label>
                <div class="space-y-3">
                  <div 
                    v-for="(reward, index) in form.config.rewards" 
                    :key="index" 
                    class="flex gap-3 items-center"
                  >
                    <input 
                      v-model.number="reward.points" 
                      type="number" 
                      placeholder="Puntos" 
                      min="1"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                    <input 
                      v-model="reward.reward" 
                      type="text" 
                      placeholder="Recompensa"
                      class="flex-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                    <button 
                      @click="removeReward(index)" 
                      type="button" 
                      class="p-2 text-red-600 hover:text-red-800"
                    >
                      <TrashIcon class="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    @click="addReward" 
                    type="button" 
                    class="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800"
                  >
                    + Agregar Nivel de Recompensa
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Fechas de Validez -->
          <div class="form-section">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Validez del Programa</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Inicio
                </label>
                <input 
                  v-model="form.startDate" 
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Fin
                </label>
                <input 
                  v-model="form.endDate" 
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
            </div>
          </div>
          
          <!-- Error Display -->
          <div v-if="submitError" class="bg-red-50 border border-red-200 rounded-md p-4">
            <div class="flex">
              <ExclamationTriangleIcon class="h-5 w-5 text-red-400" />
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Error al guardar</h3>
                <p class="text-sm text-red-700 mt-1">{{ submitError }}</p>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button 
              type="button" 
              @click="$emit('cancel')" 
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              :disabled="!isFormValid || submitting"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <div v-if="submitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ isEditing ? 'Actualizar' : 'Crear' }} Programa
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  XMarkIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import { useLoyaltyPrograms } from '@/composables/useLoyaltyPrograms'

const props = defineProps({
  program: {
    type: Object,
    default: null
  },
  isEditing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['save', 'cancel'])

// Estado del formulario
const form = ref({
  name: '',
  description: '',
  type: '',
  config: {},
  startDate: '',
  endDate: '',
  priority: 1,
  status: 'active'
})

const keywordsInput = ref('')
const errors = ref({})
const submitError = ref('')
const submitting = ref(false)

// Validación
const { validateProgramData } = useLoyaltyPrograms()

const isFormValid = computed(() => {
  return form.value.name && 
         form.value.type && 
         Object.keys(errors.value).length === 0
})

// Métodos
const resetConfig = () => {
  form.value.config = {}
  errors.value = {}
  
  // Inicializar configuración según el tipo
  switch (form.value.type) {
    case 'visits':
      form.value.config = { target: 10, reward: '' }
      break
    case 'specific_product':
      form.value.config = { target: 6, productKeywords: [], reward: '' }
      break
    case 'ticket_value':
      form.value.config = { target: 5, minTicketValue: 25, reward: '' }
      break
    case 'points':
      form.value.config = { pointsPerDollar: 1, rewards: [] }
      break
  }
}

const addKeyword = () => {
  const keyword = keywordsInput.value.trim()
  if (keyword && !form.value.config.productKeywords.includes(keyword)) {
    form.value.config.productKeywords.push(keyword)
    keywordsInput.value = ''
  }
}

const removeKeyword = (index) => {
  form.value.config.productKeywords.splice(index, 1)
}

const addReward = () => {
  form.value.config.rewards.push({ points: 0, reward: '' })
}

const removeReward = (index) => {
  form.value.config.rewards.splice(index, 1)
}

const validateForm = () => {
  const validation = validateProgramData(form.value)
  
  if (!validation.isValid) {
    // Convertir errores a formato objeto para mostrar por campo
    errors.value = {}
    validation.errors.forEach(error => {
      if (error.includes('nombre')) errors.value.name = error
      if (error.includes('tipo')) errors.value.type = error
      if (error.includes('visitas') || error.includes('productos') || error.includes('tickets')) {
        errors.value['config.target'] = error
      }
      if (error.includes('recompensa')) errors.value['config.reward'] = error
    })
    
    return false
  }
  
  errors.value = {}
  return true
}

const handleSubmit = async () => {
  submitError.value = ''
  
  if (!validateForm()) {
    return
  }
  
  submitting.value = true
  
  try {
    await emit('save', { ...form.value })
    // El componente padre manejará el cierre del modal
  } catch (error) {
    submitError.value = error.message || 'Error al guardar el programa'
  } finally {
    submitting.value = false
  }
}

// Inicialización
const initializeForm = () => {
  if (props.program) {
    form.value = { ...props.program }
    
    // Asegurar que productKeywords es un array
    if (form.value.type === 'specific_product' && !Array.isArray(form.value.config?.productKeywords)) {
      form.value.config.productKeywords = []
    }
    
    // Asegurar que rewards es un array
    if (form.value.type === 'points' && !Array.isArray(form.value.config?.rewards)) {
      form.value.config.rewards = []
    }
  } else {
    // Programa nuevo
    form.value = {
      name: '',
      description: '',
      type: '',
      config: {},
      startDate: '',
      endDate: '',
      priority: 1,
      status: 'active'
    }
  }
}

// Watchers
watch(() => props.program, initializeForm, { immediate: true })

// Lifecycle
onMounted(initializeForm)
</script>

<style scoped>
.modal-overlay {
  backdrop-filter: blur(4px);
}

.form-section {
  @apply border border-gray-200 rounded-lg p-4 bg-gray-50;
}

.form-group label {
  @apply font-medium;
}

.config-section {
  @apply bg-white p-4 rounded border border-gray-200;
}

/* Animaciones */
.modal-content {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>