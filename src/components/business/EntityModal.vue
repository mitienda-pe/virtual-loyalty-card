<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex min-h-screen items-center justify-center p-4">
      <!-- Overlay -->
      <div 
        class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        @click="$emit('cancel')"
      ></div>
      
      <!-- Modal Content -->
      <div class="relative w-full max-w-md bg-white rounded-lg shadow-xl">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ isEditing ? 'Editar' : 'Agregar' }} Entidad Comercial
          </h3>
        </div>
        
        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="px-6 py-4 space-y-4">
          <!-- Razón Social -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Razón Social *
            </label>
            <input 
              v-model="form.businessName" 
              type="text" 
              required
              placeholder="Ej: McDonald's Peru S.A.C."
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              :class="{ 'border-red-300': errors.businessName }"
            />
            <p v-if="errors.businessName" class="mt-1 text-sm text-red-600">
              {{ errors.businessName }}
            </p>
          </div>

          <!-- RUC -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              RUC *
            </label>
            <input 
              v-model="form.ruc" 
              type="text" 
              required
              pattern="[0-9]{11}"
              maxlength="11"
              placeholder="20123456789"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              :class="{ 'border-red-300': errors.ruc }"
              @input="onRucInput"
              @blur="validateRUC"
            />
            <p v-if="errors.ruc" class="mt-1 text-sm text-red-600">
              {{ errors.ruc }}
            </p>
            <p v-else class="mt-1 text-xs text-gray-500">
              Debe contener exactamente 11 dígitos
            </p>
          </div>

          <!-- Dirección -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Dirección *
            </label>
            <input 
              v-model="form.address" 
              type="text" 
              required
              placeholder="Av. Javier Prado 123, San Isidro"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              :class="{ 'border-red-300': errors.address }"
            />
            <p v-if="errors.address" class="mt-1 text-sm text-red-600">
              {{ errors.address }}
            </p>
          </div>

          <!-- Ubicaciones/Locales -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Ubicaciones/Locales
            </label>
            <LocationsInput v-model="form.locations" />
            <p class="mt-1 text-xs text-gray-500">
              Opcional: Agrega ubicaciones específicas como "Mall del Sur", "Centro de Lima", etc.
            </p>
          </div>
        </form>
        
        <!-- Actions -->
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button 
            type="button" 
            @click="$emit('cancel')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            @click="handleSubmit"
            :disabled="!isFormValid || isValidating"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isValidating" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Validando...
            </span>
            <span v-else>
              {{ isEditing ? 'Actualizar' : 'Crear' }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import LocationsInput from './LocationsInput.vue'
import { useBusinessEntities } from '@/composables/useBusinessEntities'

const props = defineProps({
  entity: {
    type: Object,
    default: null
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  existingRucs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['save', 'cancel'])

const { validateRUCUnique } = useBusinessEntities()

// Estado del formulario
const form = ref({
  businessName: '',
  ruc: '',
  address: '',
  locations: []
})

const errors = ref({})
const isValidating = ref(false)

// Computed
const isFormValid = computed(() => {
  return form.value.businessName.trim() &&
         form.value.ruc.trim() &&
         form.value.address.trim() &&
         Object.keys(errors.value).length === 0
})

// Watchers
watch(() => props.entity, (newEntity) => {
  if (newEntity) {
    form.value = {
      businessName: newEntity.businessName || '',
      ruc: newEntity.ruc || '',
      address: newEntity.address || '',
      locations: [...(newEntity.locations || [])]
    }
  }
}, { immediate: true })

// Métodos
const onRucInput = (event) => {
  // Solo permitir números
  const value = event.target.value.replace(/\D/g, '')
  form.value.ruc = value
  
  // Limpiar error si se está corrigiendo
  if (errors.value.ruc) {
    delete errors.value.ruc
  }
}

const validateRUC = async () => {
  const ruc = form.value.ruc.trim()
  
  // Validar formato
  if (ruc.length !== 11) {
    errors.value.ruc = 'El RUC debe tener exactamente 11 dígitos'
    return false
  }
  
  if (!/^[0-9]{11}$/.test(ruc)) {
    errors.value.ruc = 'El RUC solo debe contener números'
    return false
  }
  
  // Validar que no exista en otras entidades
  if (props.existingRucs.includes(ruc)) {
    errors.value.ruc = 'Este RUC ya está siendo usado por otra entidad'
    return false
  }
  
  // Validar que no exista globalmente
  isValidating.value = true
  try {
    const isUnique = await validateRUCUnique(ruc)
    if (!isUnique) {
      errors.value.ruc = 'Este RUC ya está registrado en otro negocio'
      return false
    }
  } catch (error) {
    console.error('Error validando RUC:', error)
    errors.value.ruc = 'Error validando RUC. Intente nuevamente.'
    return false
  } finally {
    isValidating.value = false
  }
  
  // Si llegamos aquí, el RUC es válido
  delete errors.value.ruc
  return true
}

const validateForm = async () => {
  errors.value = {}
  
  // Validar campos requeridos
  if (!form.value.businessName.trim()) {
    errors.value.businessName = 'La razón social es requerida'
  }
  
  if (!form.value.address.trim()) {
    errors.value.address = 'La dirección es requerida'
  }
  
  // Validar RUC
  if (!form.value.ruc.trim()) {
    errors.value.ruc = 'El RUC es requerido'
  } else {
    const isRucValid = await validateRUC()
    if (!isRucValid) {
      return false
    }
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  const isValid = await validateForm()
  
  if (isValid) {
    emit('save', {
      businessName: form.value.businessName.trim(),
      ruc: form.value.ruc.trim(),
      address: form.value.address.trim(),
      locations: form.value.locations.filter(loc => loc.trim())
    })
  }
}

// Inicializar formulario al montar
onMounted(() => {
  if (props.entity) {
    form.value = {
      businessName: props.entity.businessName || '',
      ruc: props.entity.ruc || '',
      address: props.entity.address || '',
      locations: [...(props.entity.locations || [])]
    }
  }
})
</script>
