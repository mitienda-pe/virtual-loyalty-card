<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Configuración de Extracción</h1>
        <p class="mt-2 text-gray-600">
          Configura los patrones de extracción de datos para los comprobantes de este negocio
        </p>
      </div>

      <!-- Business Selection -->
      <div class="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <label for="business-select" class="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Negocio
        </label>
        <select
          id="business-select"
          v-model="selectedBusinessId"
          @change="loadBusinessConfig"
          class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Seleccione un negocio...</option>
          <option
            v-for="business in businesses"
            :key="business.id"
            :value="business.id"
          >
            {{ business.name }} (RUC: {{ business.ruc }})
          </option>
        </select>
      </div>

      <!-- Configuration Form -->
      <div v-if="selectedBusinessId" class="space-y-6">
        <!-- RUC Patterns -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Patrones de RUC</h2>
          <div class="space-y-3">
            <div
              v-for="(pattern, index) in config.rucPatterns"
              :key="index"
              class="flex items-center space-x-2"
            >
              <input
                v-model="config.rucPatterns[index]"
                type="text"
                class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Ej: /RUC\s*:?\s*([0-9]{11})/i"
              />
              <button
                @click="removePattern('rucPatterns', index)"
                class="text-red-600 hover:text-red-800"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              @click="addPattern('rucPatterns')"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + Agregar patrón de RUC
            </button>
          </div>
        </div>

        <!-- Amount Patterns -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Patrones de Monto</h2>
          <div class="space-y-3">
            <div
              v-for="(pattern, index) in config.amountPatterns"
              :key="index"
              class="flex items-center space-x-2"
            >
              <input
                v-model="config.amountPatterns[index]"
                type="text"
                class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Ej: /TOTAL\s*:?\s*S\/\s*([0-9]+[.,][0-9]{2})/i"
              />
              <button
                @click="removePattern('amountPatterns', index)"
                class="text-red-600 hover:text-red-800"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              @click="addPattern('amountPatterns')"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + Agregar patrón de monto
            </button>
          </div>
        </div>

        <!-- Invoice Number Patterns -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Patrones de Número de Comprobante</h2>
          <div class="space-y-3">
            <div
              v-for="(pattern, index) in config.invoiceNumberPatterns"
              :key="index"
              class="flex items-center space-x-2"
            >
              <input
                v-model="config.invoiceNumberPatterns[index]"
                type="text"
                class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Ej: /FACTURA\s*N[°o]?\s*([A-Z0-9\-]+)/i"
              />
              <button
                @click="removePattern('invoiceNumberPatterns', index)"
                class="text-red-600 hover:text-red-800"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              @click="addPattern('invoiceNumberPatterns')"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + Agregar patrón de número de comprobante
            </button>
          </div>
        </div>

        <!-- Business Name Patterns -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Patrones de Nombre de Negocio</h2>
          <div class="space-y-3">
            <div
              v-for="(pattern, index) in config.businessNamePatterns"
              :key="index"
              class="flex items-center space-x-2"
            >
              <input
                v-model="config.businessNamePatterns[index]"
                type="text"
                class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Ej: /RAZON SOCIAL\s*:?\s*(.+?)(?=\n|$)/i"
              />
              <button
                @click="removePattern('businessNamePatterns', index)"
                class="text-red-600 hover:text-red-800"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              @click="addPattern('businessNamePatterns')"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + Agregar patrón de nombre de negocio
            </button>
          </div>
        </div>

        <!-- Test Section -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Probar Configuración</h2>
          <div class="space-y-4">
            <div>
              <label for="test-text" class="block text-sm font-medium text-gray-700 mb-2">
                Texto de prueba (OCR de comprobante)
              </label>
              <textarea
                id="test-text"
                v-model="testText"
                rows="8"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Pega aquí el texto extraído de un comprobante para probar los patrones..."
              ></textarea>
            </div>
            <button
              @click="testPatterns"
              :disabled="!testText"
              class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Probar Patrones
            </button>
            <div v-if="testResult" class="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 class="font-medium text-gray-900 mb-2">Resultado de la prueba:</h3>
              <pre class="text-sm text-gray-700 whitespace-pre-wrap">{{ JSON.stringify(testResult, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end space-x-4">
          <button
            @click="resetConfig"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Resetear
          </button>
          <button
            @click="saveConfig"
            :disabled="saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving ? 'Guardando...' : 'Guardar Configuración' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'

// Reactive data
const businesses = ref([])
const selectedBusinessId = ref('')
const saving = ref(false)
const testText = ref('')
const testResult = ref(null)

// Default configuration
const defaultConfig = {
  rucPatterns: [
    '/R\\.U\\.C\\.\\s*:?\\s*([0-9]{11})/i',
    '/RUC\\s*:?\\s*([0-9]{11})/i'
  ],
  amountPatterns: [
    '/TOTAL\\s*:?\\s*S\\/\\s*([0-9]+[.,][0-9]{2})/i',
    '/IMPORTE\\s+TOTAL\\s*:?\\s*S\\/\\.?\\s*([0-9]+[.,][0-9]{2})/i'
  ],
  invoiceNumberPatterns: [
    '/(?:Factura|Boleta|Ticket)\\s*(?:N[°o]?|No\\.?|#|:)\\s*([A-Z0-9\\-]{4,})/i',
    '/([FBT][A-Z0-9\\-]{3,})/i'
  ],
  businessNamePatterns: [
    '/RAZON SOCIAL\\s*:?\\s*(.+?)(?=\\n|$)/i',
    '/NOMBRE COMERCIAL\\s*:?\\s*(.+?)(?=\\n|$)/i'
  ]
}

const config = reactive({ ...defaultConfig })

// Methods
const loadBusinesses = async () => {
  try {
    const businessesSnapshot = await getDocs(collection(db, 'businesses'))
    businesses.value = businessesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading businesses:', error)
  }
}

const loadBusinessConfig = async () => {
  if (!selectedBusinessId.value) return

  try {
    const configDoc = await getDoc(doc(db, 'business_extraction_config', selectedBusinessId.value))
    if (configDoc.exists()) {
      Object.assign(config, configDoc.data())
    } else {
      Object.assign(config, defaultConfig)
    }
  } catch (error) {
    console.error('Error loading business config:', error)
  }
}

const addPattern = (patternType) => {
  config[patternType].push('')
}

const removePattern = (patternType, index) => {
  config[patternType].splice(index, 1)
}

const testPatterns = () => {
  if (!testText.value) return

  // Simulate pattern testing (in a real implementation, this would call your extraction function)
  const result = {
    ruc: null,
    amount: null,
    invoiceNumber: null,
    businessName: null
  }

  // Test RUC patterns
  for (const pattern of config.rucPatterns) {
    try {
      const regex = new RegExp(pattern.slice(1, -2), pattern.slice(-1))
      const match = testText.value.match(regex)
      if (match) {
        result.ruc = match[1]
        break
      }
    } catch (e) {
      console.error('Invalid RUC pattern:', pattern, e)
    }
  }

  // Test amount patterns
  for (const pattern of config.amountPatterns) {
    try {
      const regex = new RegExp(pattern.slice(1, -2), pattern.slice(-1))
      const match = testText.value.match(regex)
      if (match) {
        result.amount = match[1]
        break
      }
    } catch (e) {
      console.error('Invalid amount pattern:', pattern, e)
    }
  }

  // Test invoice number patterns
  for (const pattern of config.invoiceNumberPatterns) {
    try {
      const regex = new RegExp(pattern.slice(1, -2), pattern.slice(-1))
      const match = testText.value.match(regex)
      if (match) {
        result.invoiceNumber = match[1]
        break
      }
    } catch (e) {
      console.error('Invalid invoice pattern:', pattern, e)
    }
  }

  // Test business name patterns
  for (const pattern of config.businessNamePatterns) {
    try {
      const regex = new RegExp(pattern.slice(1, -2), pattern.slice(-1))
      const match = testText.value.match(regex)
      if (match) {
        result.businessName = match[1]
        break
      }
    } catch (e) {
      console.error('Invalid business name pattern:', pattern, e)
    }
  }

  testResult.value = result
}

const saveConfig = async () => {
  if (!selectedBusinessId.value) return

  saving.value = true
  try {
    await setDoc(doc(db, 'business_extraction_config', selectedBusinessId.value), config)
    alert('Configuración guardada exitosamente')
  } catch (error) {
    console.error('Error saving config:', error)
    alert('Error al guardar la configuración')
  } finally {
    saving.value = false
  }
}

const resetConfig = () => {
  Object.assign(config, defaultConfig)
  testResult.value = null
  testText.value = ''
}

// Lifecycle
onMounted(() => {
  loadBusinesses()
})
</script>
