<!-- src/components/admin/ExtractionConfigManager.vue -->
<template>
    <div class="extraction-config-manager">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">
              Configuración de Extracción de Texto
            </h2>
            <p class="text-gray-600 mt-1">
              Personaliza cómo se extrae información de los comprobantes para este negocio
            </p>
          </div>
          
          <div class="flex gap-3">
            <button
              @click="generateAutoConfig"
              :disabled="loading"
              class="btn-secondary"
            >
              <MagicWandIcon class="w-4 h-4" />
              Generar Automático
            </button>
            
            <button
              @click="loadStats"
              :disabled="loading"
              class="btn-secondary"
            >
              <ChartBarIcon class="w-4 h-4" />
              Ver Estadísticas
            </button>
          </div>
        </div>
  
        <!-- Estadísticas -->
        <div v-if="stats" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-blue-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{ stats.successRate }}%</div>
            <div class="text-sm text-blue-700">Tasa de Éxito</div>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ stats.successfulExtractions }}</div>
            <div class="text-sm text-green-700">Extracciones Exitosas</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-gray-600">{{ stats.totalProcessed }}</div>
            <div class="text-sm text-gray-700">Total Procesados</div>
          </div>
        </div>
  
        <!-- Configuración Principal -->
        <div class="space-y-6">
          <!-- Aliases del Negocio -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Nombres Alternativos del Negocio
            </label>
            <p class="text-sm text-gray-500 mb-3">
              Diferentes formas como aparece el nombre en los comprobantes
            </p>
            
            <div class="space-y-2">
              <div 
                v-for="(alias, index) in config.aliases" 
                :key="index"
                class="flex items-center gap-2"
              >
                <input
                  v-model="config.aliases[index]"
                  type="text"
                  class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ej: La Baguette, CORPORACION BAGUETERA"
                />
                <button
                  @click="removeAlias(index)"
                  class="text-red-500 hover:text-red-700"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
              
              <button
                @click="addAlias"
                class="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Agregar nombre alternativo
              </button>
            </div>
          </div>
  
          <!-- Patrones de Dirección -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Patrones de Dirección Específicos
            </label>
            <p class="text-sm text-gray-500 mb-3">
              Expresiones regulares para extraer la dirección específica de este negocio
            </p>
            
            <div class="space-y-2">
              <div 
                v-for="(pattern, index) in config.addressPatterns" 
                :key="index"
                class="flex items-center gap-2"
              >
                <input
                  v-model="config.addressPatterns[index]"
                  type="text"
                  class="flex-1 font-mono text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ej: /JR\\.?\\s+LUIS\\s+SANCHEZ\\s+CERRO[^\\n]+/i"
                />
                <button
                  @click="removeAddressPattern(index)"
                  class="text-red-500 hover:text-red-700"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
              
              <button
                @click="addAddressPattern"
                class="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Agregar patrón de dirección
              </button>
            </div>
          </div>
  
          <!-- Patrones de Monto Específicos -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Patrones de Monto Específicos
            </label>
            <p class="text-sm text-gray-500 mb-3">
              Patrones especiales para extraer el monto total en este negocio
            </p>
            
            <div class="space-y-2">
              <div 
                v-for="(pattern, index) in config.specificAmountPatterns" 
                :key="index"
                class="flex items-center gap-2"
              >
                <input
                  v-model="config.specificAmountPatterns[index]"
                  type="text"
                  class="flex-1 font-mono text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ej: /TOTAL\\s+SOLES\\s+S\\/\\s*([0-9]+[.,][0-9]{2})/i"
                />
                <button
                  @click="removeAmountPattern(index)"
                  class="text-red-500 hover:text-red-700"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
              
              <button
                @click="addAmountPattern"
                class="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Agregar patrón de monto
              </button>
            </div>
          </div>
  
          <!-- Patrones de Número de Comprobante -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Patrones de Número de Comprobante
            </label>
            <p class="text-sm text-gray-500 mb-3">
              Patrones para extraer números de factura/boleta específicos de este negocio
            </p>
            
            <div class="space-y-2">
              <div 
                v-for="(pattern, index) in config.invoicePatterns" 
                :key="index"
                class="flex items-center gap-2"
              >
                <input
                  v-model="config.invoicePatterns[index]"
                  type="text"
                  class="flex-1 font-mono text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ej: /B\\s*([0-9]{3})\\s*-\\s*([0-9]{6,8})/i"
                />
                <button
                  @click="removeInvoicePattern(index)"
                  class="text-red-500 hover:text-red-700"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
              
              <button
                @click="addInvoicePattern"
                class="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Agregar patrón de comprobante
              </button>
            </div>
          </div>
  
          <!-- Área de Prueba -->
          <div class="border-t pt-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">
              Probar Configuración
            </h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Texto de Comprobante de Prueba
                </label>
                <textarea
                  v-model="testText"
                  rows="8"
                  class="w-full font-mono text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Pega aquí el texto extraído de un comprobante para probar la configuración..."
                ></textarea>
              </div>
              
              <div class="flex gap-3">
                <button
                  @click="testConfiguration"
                  :disabled="!testText || loading"
                  class="btn-primary"
                >
                  <BeakerIcon class="w-4 h-4" />
                  Probar Configuración
                </button>
                
                <button
                  @click="clearTestText"
                  :disabled="!testText"
                  class="btn-secondary"
                >
                  Limpiar
                </button>
              </div>
              
              <!-- Resultado de la Prueba -->
              <div v-if="testResult" class="mt-4">
                <div 
                  :class="{
                    'bg-green-50 border-green-200': testResult.success,
                    'bg-red-50 border-red-200': !testResult.success
                  }"
                  class="border rounded-lg p-4"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <CheckCircleIcon 
                      v-if="testResult.success" 
                      class="w-5 h-5 text-green-500"
                    />
                    <XCircleIcon 
                      v-else 
                      class="w-5 h-5 text-red-500"
                    />
                    <span class="font-medium">
                      {{ testResult.success ? 'Prueba Exitosa' : 'Prueba Fallida' }}
                    </span>
                    <span 
                      v-if="testResult.confidence"
                      :class="{
                        'text-green-600': testResult.confidence >= 80,
                        'text-yellow-600': testResult.confidence >= 50,
                        'text-red-600': testResult.confidence < 50
                      }"
                      class="text-sm font-medium"
                    >
                      ({{ testResult.confidence }}% confianza)
                    </span>
                  </div>
                  
                  <div v-if="testResult.success && testResult.result" class="space-y-2 text-sm">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <span class="font-medium">RUC:</span>
                        <span :class="testResult.result.ruc ? 'text-green-600' : 'text-red-600'">
                          {{ testResult.result.ruc || 'No extraído' }}
                        </span>
                      </div>
                      <div>
                        <span class="font-medium">Monto:</span>
                        <span :class="testResult.result.amount ? 'text-green-600' : 'text-red-600'">
                          {{ testResult.result.amount ? `S/ ${testResult.result.amount}` : 'No extraído' }}
                        </span>
                      </div>
                      <div>
                        <span class="font-medium">Comprobante:</span>
                        <span :class="testResult.result.invoiceId ? 'text-green-600' : 'text-red-600'">
                          {{ testResult.result.invoiceId || 'No extraído' }}
                        </span>
                      </div>
                      <div>
                        <span class="font-medium">Negocio:</span>
                        <span :class="testResult.result.businessName ? 'text-green-600' : 'text-red-600'">
                          {{ testResult.result.businessName || 'No extraído' }}
                        </span>
                      </div>
                    </div>
                    
                    <div v-if="testResult.result.address">
                      <span class="font-medium">Dirección:</span>
                      <span class="text-green-600">{{ testResult.result.address }}</span>
                    </div>
                  </div>
                  
                  <div v-if="!testResult.success" class="text-red-600 text-sm">
                    {{ testResult.error }}
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          <!-- Botones de Acción -->
          <div class="flex justify-between pt-6 border-t">
            <div>
              <button
                v-if="hasExistingConfig"
                @click="deleteConfiguration"
                :disabled="loading"
                class="btn-danger"
              >
                <TrashIcon class="w-4 h-4" />
                Eliminar Configuración
              </button>
            </div>
            
            <div class="flex gap-3">
              <button
                @click="resetConfiguration"
                :disabled="loading"
                class="btn-secondary"
              >
                Restablecer
              </button>
              
              <button
                @click="saveConfiguration"
                :disabled="loading || !isConfigValid"
                class="btn-primary"
              >
                <SaveIcon class="w-4 h-4" />
                {{ loading ? 'Guardando...' : 'Guardar Configuración' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import { 
    MagicWandIcon, 
    ChartBarIcon, 
    TrashIcon, 
    BeakerIcon,
    CheckCircleIcon,
    XCircleIcon,
    SaveIcon
  } from '@heroicons/vue/24/outline'
  
  // Props y stores
  const route = useRoute()
  const authStore = useAuthStore()
  
  // Estado reactivo
  const loading = ref(false)
  const config = ref({
    aliases: [],
    addressPatterns: [],
    specificAmountPatterns: [],
    invoicePatterns: []
  })
  const originalConfig = ref(null)
  const stats = ref(null)
  const testText = ref('')
  const testResult = ref(null)
  const hasExistingConfig = ref(false)
  
  // Computed
  const businessSlug = computed(() => route.params.businessSlug)
  const isConfigValid = computed(() => {
    return config.value.aliases.length > 0 || 
           config.value.addressPatterns.length > 0 || 
           config.value.specificAmountPatterns.length > 0 || 
           config.value.invoicePatterns.length > 0
  })
  
  // Métodos para gestionar aliases
  const addAlias = () => {
    config.value.aliases.push('')
  }
  
  const removeAlias = (index) => {
    config.value.aliases.splice(index, 1)
  }
  
  // Métodos para gestionar patrones de dirección
  const addAddressPattern = () => {
    config.value.addressPatterns.push('')
  }
  
  const removeAddressPattern = (index) => {
    config.value.addressPatterns.splice(index, 1)
  }
  
  // Métodos para gestionar patrones de monto
  const addAmountPattern = () => {
    config.value.specificAmountPatterns.push('')
  }
  
  const removeAmountPattern = (index) => {
    config.value.specificAmountPatterns.splice(index, 1)
  }
  
  // Métodos para gestionar patrones de comprobante
  const addInvoicePattern = () => {
    config.value.invoicePatterns.push('')
  }
  
  const removeInvoicePattern = (index) => {
    config.value.invoicePatterns.splice(index, 1)
  }
  
  // Métodos principales
  const loadConfiguration = async () => {
    try {
      loading.value = true
      
      const response = await fetch(`/api/extraction-config?businessSlug=${businessSlug.value}`, {
        headers: {
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`
        }
      })
      
      if (!response.ok) throw new Error('Error cargando configuración')
      
      const data = await response.json()
      
      if (data.config) {
        config.value = {
          aliases: data.config.aliases || [],
          addressPatterns: data.config.addressPatterns || [],
          specificAmountPatterns: data.config.specificAmountPatterns || [],
          invoicePatterns: data.config.invoicePatterns || []
        }
        originalConfig.value = JSON.parse(JSON.stringify(config.value))
        hasExistingConfig.value = true
      } else {
        hasExistingConfig.value = false
      }
    } catch (error) {
      console.error('Error cargando configuración:', error)
      // Mostrar notificación de error
    } finally {
      loading.value = false
    }
  }
  
  const saveConfiguration = async () => {
    try {
      loading.value = true
      
      // Limpiar arrays de valores vacíos
      const cleanConfig = {
        aliases: config.value.aliases.filter(alias => alias.trim()),
        addressPatterns: config.value.addressPatterns.filter(pattern => pattern.trim()),
        specificAmountPatterns: config.value.specificAmountPatterns.filter(pattern => pattern.trim()),
        invoicePatterns: config.value.invoicePatterns.filter(pattern => pattern.trim())
      }
      
      const response = await fetch('/api/extraction-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`
        },
        body: JSON.stringify({
          businessSlug: businessSlug.value,
          config: cleanConfig,
          testText: testText.value || null
        })
      })
      
      if (!response.ok) throw new Error('Error guardando configuración')
      
      const data = await response.json()
      
      // Mostrar notificación de éxito
      console.log('Configuración guardada exitosamente')
      
      // Si había resultado de prueba, mostrarlo
      if (data.testResult) {
        testResult.value = data.testResult
      }
      
      hasExistingConfig.value = true
      originalConfig.value = JSON.parse(JSON.stringify(config.value))
      
    } catch (error) {
      console.error('Error guardando configuración:', error)
      // Mostrar notificación de error
    } finally {
      loading.value = false
    }
  }
  
  const generateAutoConfig = async () => {
    try {
      loading.value = true
      
      const response = await fetch(`/api/extraction-config?businessSlug=${businessSlug.value}&action=generate`, {
        headers: {
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`
        }
      })
      
      if (!response.ok) throw new Error('Error generando configuración automática')
      
      const data = await response.json()
      
      if (data.config) {
        config.value = {
          aliases: data.config.aliases || [],
          addressPatterns: data.config.addressPatterns || [],
          specificAmountPatterns: data.config.specificAmountPatterns || [],
          invoicePatterns: data.config.invoicePatterns || []
        }
        
        // Mostrar notificación
        console.log(data.message)
      } else {
        console.log('No hay suficientes datos para generar configuración automática')
      }
      
    } catch (error) {
      console.error('Error generando configuración automática:', error)
    } finally {
      loading.value = false
    }
  }
  
  const loadStats = async () => {
    try {
      loading.value = true
      
      const response = await fetch(`/api/extraction-config?businessSlug=${businessSlug.value}&action=stats`, {
        headers: {
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`
        }
      })
      
      if (!response.ok) throw new Error('Error cargando estadísticas')
      
      const data = await response.json()
      stats.value = data.stats
      
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      loading.value = false
    }
  }
  
  const testConfiguration = async () => {
    if (!testText.value.trim()) return
    
    try {
      loading.value = true
      
      // Limpiar configuración antes de probar
      const cleanConfig = {
        aliases: config.value.aliases.filter(alias => alias.trim()),
        addressPatterns: config.value.addressPatterns.filter(pattern => pattern.trim()),
        specificAmountPatterns: config.value.specificAmountPatterns.filter(pattern => pattern.trim()),
        invoicePatterns: config.value.invoicePatterns.filter(pattern => pattern.trim())
      }
      
      const response = await fetch('/api/extraction-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`
        },
        body: JSON.stringify({
          businessSlug: businessSlug.value,
          config: cleanConfig,
          testText: testText.value
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        testResult.value = data.testResult
      } else {
        testResult.value = {
          success: false,
          error: data.error || 'Error en la prueba'
        }
      }
      
    } catch (error) {
      console.error('Error probando configuración:', error)
      testResult.value = {
        success: false,
        error: 'Error de conexión'
      }
    } finally {
      loading.value = false
    }
  }
  
  const deleteConfiguration = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta configuración?')) return
    
    try {
      loading.value = true
      
      const response = await fetch(`/api/extraction-config?businessSlug=${businessSlug.value}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`
        }
      })
      
      if (!response.ok) throw new Error('Error eliminando configuración')
      
      // Restablecer configuración
      config.value = {
        aliases: [],
        addressPatterns: [],
        specificAmountPatterns: [],
        invoicePatterns: []
      }
      
      hasExistingConfig.value = false
      testResult.value = null
      
      console.log('Configuración eliminada exitosamente')
      
    } catch (error) {
      console.error('Error eliminando configuración:', error)
    } finally {
      loading.value = false
    }
  }
  
  const resetConfiguration = () => {
    if (originalConfig.value) {
      config.value = JSON.parse(JSON.stringify(originalConfig.value))
    } else {
      config.value = {
        aliases: [],
        addressPatterns: [],
        specificAmountPatterns: [],
        invoicePatterns: []
      }
    }
    testResult.value = null
  }
  
  const clearTestText = () => {
    testText.value = ''
    testResult.value = null
  }
  
  // Lifecycle
  onMounted(() => {
    loadConfiguration()
    loadStats()
  })
  
  // Watchers
  watch(() => config.value, () => {
    // Limpiar resultado de prueba cuando cambie la configuración
    testResult.value = null
  }, { deep: true })
  </script>
  
  <style scoped>
  .btn-primary {
    @apply inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .btn-secondary {
    @apply inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .btn-danger {
    @apply inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  </style>