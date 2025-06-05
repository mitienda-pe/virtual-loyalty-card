<!-- src/views/admin/BusinessForm.vue -->
<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-gray-900">{{ isEdit ? 'Editar negocio' : 'Nuevo negocio' }}</h1>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Información básica -->
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
            Información básica
          </h3>
          <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="name" class="block text-sm font-medium text-gray-700">
                Nombre comercial
              </label>
              <input type="text" id="name" v-model="form.name" required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label for="slug" class="block text-sm font-medium text-gray-700">
                Slug (URL)
              </label>
              <input type="text" id="slug" v-model="form.slug" required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div class="sm:col-span-2">
              <label for="description" class="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea id="description" v-model="form.description" rows="3"
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- NUEVA SECCIÓN: Entidades Comerciales -->
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <BusinessEntitiesManager 
            v-model="form.businessEntities"
            v-model:primary-entity-id="form.primaryEntityId"
            @validate="handleEntitiesValidation"
          />
        </div>
      </div>

      <!-- Diseño -->
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
            Diseño
          </h3>
          <div class="grid grid-cols-1 gap-y-6 sm:grid-cols-2 gap-x-4 mb-6">
            <ImageUpload label="Logo del negocio" :preview="logoPreview" :error="logoError"
              @change="handleLogoChange" />
            <ImageUpload label="Imagen de portada" :preview="coverPreview" :error="coverError"
              @change="handleCoverChange" />
          </div>
          <!-- Color de fondo -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Color de fondo</label>
            <input type="color" v-model="form.backgroundColor" class="h-10 w-20" />
          </div>
          <!-- Icono -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Icono de la tarjeta</label>
            <IconPicker v-model="form.icon" />
          </div>
        </div>
      </div>

      <!-- Configuración de la tarjeta -->
      <!-- Encabezado del programa de lealtad -->
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div class="flex items-center">
          <span class="text-2xl mr-2">🎁</span>
          <h2 class="text-xl font-bold text-yellow-800">Programa de Lealtad</h2>
        </div>
        <p class="mt-2 text-yellow-700">Configura aquí los escalones y premios que tus clientes pueden alcanzar por sus compras.</p>
      </div>
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
            Configuración de la tarjeta de fidelización
          </h3>

          <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label for="purchasesRequired" class="block text-sm font-medium text-gray-700">
                Compras requeridas
              </label>
              <input type="number" id="purchasesRequired" v-model="form.config.purchasesRequired" required
                min="1"
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label for="minAmount" class="block text-sm font-medium text-gray-700">
                Monto mínimo por consumo
              </label>
              <input type="number" id="minAmount" v-model="form.config.minAmount" min="0" step="0.01"
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>

          <!-- Premios escalonados -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Premios escalonados
            </label>
            <div v-for="(reward, idx) in form.config.rewards" :key="idx" class="flex items-center space-x-2 mb-2">
              <input type="number" v-model.number="reward.consumptions" min="1" placeholder="Consumos" class="w-24 border rounded px-2 py-1" />
              <input type="text" v-model="reward.reward" placeholder="Descripción del premio" class="flex-1 border rounded px-2 py-1" />
              <button type="button" @click="form.config.rewards.splice(idx, 1)" class="text-red-500 hover:text-red-700">Eliminar</button>
            </div>
            <button type="button" @click="form.config.rewards.push({ consumptions: '', reward: '' })" class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded">Añadir premio</button>
          </div>

          <div>
            <label for="timeLimit" class="block text-sm font-medium text-gray-700">
              Tiempo mínimo entre compras (minutos)
            </label>
            <input type="number" id="timeLimit" v-model="form.config.timeLimit" required min="0"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div>
            <label for="expirationDays" class="block text-sm font-medium text-gray-700">
              Días de validez de las compras
            </label>
            <input type="number" id="expirationDays" v-model="form.config.expirationDays" required
              min="1"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div class="sm:col-span-2">
            <label for="reward" class="block text-sm font-medium text-gray-700">
              Premio principal
            </label>
            <input type="text" id="reward" v-model="form.config.reward" required
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      </div>

      <!-- Información de contacto -->
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
            Información de contacto
          </h3>
          <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label for="city" class="block text-sm font-medium text-gray-700">
                Ciudad
              </label>
              <input type="text" id="city" v-model="form.city" required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label for="phone" class="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input type="text" id="phone" v-model="form.phone" required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <!-- Errores de validación -->
      <div v-if="validationErrors.length > 0" class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">
              Hay errores que debes corregir:
            </h3>
            <div class="mt-2 text-sm text-red-700">
              <ul class="list-disc pl-5 space-y-1">
                <li v-for="error in validationErrors" :key="error">{{ error }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-3">
        <router-link :to="props.businessSlug ? '/admin/business/dashboard' : '/admin/businesses'"
          class="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          Cancelar
        </router-link>
        <button type="submit" :disabled="loading || !isFormValid"
          class="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
          {{ loading ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/firebase'
import ImageUpload from '@/components/ImageUpload.vue'
import IconPicker from '@/components/IconPicker.vue'
import BusinessEntitiesManager from '@/components/business/BusinessEntitiesManager.vue'
import { useBusinessEntities } from '@/composables/useBusinessEntities'

const props = defineProps({
  businessSlug: {
    type: String,
    default: null
  },
  isBusinessAdmin: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const router = useRouter()
const { migrateBusinessToEntities, updateLegacyFields } = useBusinessEntities()

const loading = ref(false)
const logoError = ref('')
const coverError = ref('')
const logoPreview = ref('')
const coverPreview = ref('')
const logoFile = ref(null)
const coverFile = ref(null)
const entitiesValid = ref(false)
const validationErrors = ref([])

const isEdit = computed(() => !!props.businessSlug || route.params.id !== undefined)

const form = ref({
  name: '',
  slug: '',
  description: '',
  city: '',
  phone: '',
  logo: '',
  cover: '',
  backgroundColor: '#ffffff',
  icon: 'cafe',
  businessEntities: [],
  primaryEntityId: null,
  // Campos legacy (se mantienen por compatibilidad)
  businessName: '',
  ruc: '',
  address: '',
  config: {
    purchasesRequired: 10,
    minAmount: 0,
    rewards: [],
    timeLimit: 0,
    expirationDays: 90,
    reward: ''
  }
})

const isFormValid = computed(() => {
  return form.value.name.trim() &&
         form.value.slug.trim() &&
         entitiesValid.value &&
         validationErrors.value.length === 0
})

const handleLogoChange = (file) => {
  logoError.value = ''
  logoFile.value = file

  if (file) {
    logoPreview.value = URL.createObjectURL(file)
  } else {
    logoPreview.value = form.value.logo
  }
}

const handleCoverChange = (file) => {
  coverError.value = ''
  coverFile.value = file

  if (file) {
    coverPreview.value = URL.createObjectURL(file)
  } else {
    coverPreview.value = form.value.cover
  }
}

const handleEntitiesValidation = (validation) => {
  entitiesValid.value = validation.isValid
  
  // Actualizar errores de validación
  const otherErrors = validationErrors.value.filter(error => 
    !error.includes('entidad') && !error.includes('comercial')
  )
  
  if (validation.errors && validation.errors.length > 0) {
    validationErrors.value = [...otherErrors, ...validation.errors]
  } else {
    validationErrors.value = otherErrors
  }
}

const uploadImage = async (file, path) => {
  if (!file) return null

  const fileRef = storageRef(storage, `businesses/${path}`)
  await uploadBytes(fileRef, file)
  return await getDownloadURL(fileRef)
}

const loadBusiness = async () => {
  if (!props.businessSlug) return
  
  loading.value = true
  try {
    const docRef = doc(db, 'businesses', props.businessSlug)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      let data = docSnap.data()
      
      // Migrar automáticamente si es un negocio legacy
      if (!data.businessEntities && data.ruc) {
        console.log('Migrando negocio legacy a nueva estructura')
        data = migrateBusinessToEntities(data)
      }
      
      form.value = {
        ...form.value,
        ...data,
        config: {
          ...form.value.config,
          ...data.config
        },
        backgroundColor: data.backgroundColor || '#ffffff',
        icon: data.icon || 'cafe',
        businessEntities: data.businessEntities || [],
        primaryEntityId: data.primaryEntityId || null
      }
      
      logoPreview.value = form.value.logo
      coverPreview.value = form.value.cover
    }
  } catch (error) {
    console.error('Error loading business:', error)
    alert('Error cargando el negocio')
  } finally {
    loading.value = false
  }
}

const validateForm = () => {
  const errors = []
  
  if (!form.value.name.trim()) {
    errors.push('El nombre comercial es requerido')
  }
  
  if (!form.value.slug.trim()) {
    errors.push('El slug es requerido')
  }
  
  if (!entitiesValid.value) {
    errors.push('Debe tener al menos una entidad comercial válida')
  }
  
  validationErrors.value = errors
  return errors.length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }
  
  loading.value = true
  try {
    // Subir imágenes si hay archivos nuevos
    if (logoFile.value) {
      form.value.logo = await uploadImage(logoFile.value, `${form.value.slug}/logo`)
    }
    
    if (coverFile.value) {
      form.value.cover = await uploadImage(coverFile.value, `${form.value.slug}/cover`)
    }
    
    // Preparar datos del negocio
    let businessData = {
      name: form.value.name,
      slug: form.value.slug,
      description: form.value.description,
      logo: form.value.logo,
      cover: form.value.cover,
      city: form.value.city,
      phone: form.value.phone,
      backgroundColor: form.value.backgroundColor,
      icon: form.value.icon,
      businessEntities: form.value.businessEntities,
      primaryEntityId: form.value.primaryEntityId,
      config: {
        purchasesRequired: form.value.config.purchasesRequired,
        minAmount: form.value.config.minAmount,
        rewards: form.value.config.rewards,
        timeLimit: form.value.config.timeLimit,
        expirationDays: form.value.config.expirationDays,
        reward: form.value.config.reward,
      }
    }
    
    // Actualizar campos legacy para compatibilidad
    businessData = updateLegacyFields(businessData)
    
    // Agregar timestamps
    if (isEdit.value) {
      businessData.updatedAt = new Date()
      await updateDoc(doc(db, 'businesses', props.businessSlug), businessData)
    } else {
      businessData.createdAt = new Date()
      businessData.updatedAt = new Date()
      await setDoc(doc(db, 'businesses', form.value.slug), businessData)
    }
    
    // Redireccionar
    if (props.isBusinessAdmin) {
      router.push('/admin/business/dashboard')
    } else {
      router.push('/admin/businesses')
    }
  } catch (err) {
    console.error('Error saving business:', err)
    alert('Error al guardar el negocio')
  } finally {
    loading.value = false
  }
}

onMounted(loadBusiness)
</script>
