<!-- src/views/admin/BusinessExtractionConfig.vue -->
<template>
    <div class="business-extraction-config">
      <!-- Breadcrumb -->
      <nav class="flex mb-6" aria-label="Breadcrumb">
        <ol class="inline-flex items-center space-x-1 md:space-x-3">
          <li class="inline-flex items-center">
            <router-link
              to="/admin/businesses"
              class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              <BuildingOfficeIcon class="w-4 h-4 mr-2" />
              Negocios
            </router-link>
          </li>
          <li>
            <div class="flex items-center">
              <ChevronRightIcon class="w-5 h-5 text-gray-400" />
              <router-link
                :to="`/admin/businesses/${businessSlug}`"
                class="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
              >
                {{ businessName }}
              </router-link>
            </div>
          </li>
          <li aria-current="page">
            <div class="flex items-center">
              <ChevronRightIcon class="w-5 h-5 text-gray-400" />
              <span class="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                Configuración de Extracción
              </span>
            </div>
          </li>
        </ol>
      </nav>
  
      <!-- Header con información del negocio -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ businessName }}</h1>
              <p class="text-gray-600">{{ businessInfo?.ruc ? `RUC: ${businessInfo.ruc}` : 'Configurando extracción de texto' }}</p>
            </div>
          </div>
          
          <div class="flex gap-3">
            <router-link
              :to="`/admin/businesses/${businessSlug}`"
              class="btn-secondary"
            >
              <ArrowLeftIcon class="w-4 h-4" />
              Volver al Negocio
            </router-link>
            
            <button
              @click="showHelp = !showHelp"
              class="btn-secondary"
            >
              <QuestionMarkCircleIcon class="w-4 h-4" />
              Ayuda
            </button>
          </div>
        </div>
      </div>
  
      <!-- Panel de Ayuda -->
      <div v-if="showHelp" class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div class="flex">
          <InformationCircleIcon class="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 class="text-lg font-medium text-blue-900 mb-2">
              ¿Cómo funciona la configuración de extracción?
            </h3>
            <div class="text-blue-800 space-y-2">
              <p>
                Este sistema permite personalizar cómo se extraen los datos de los comprobantes específicamente para tu negocio:
              </p>
              <ul class="list-disc list-inside space-y-1 ml-4">
                <li><strong>Nombres Alternativos:</strong> Diferentes formas como aparece tu negocio en los comprobantes</li>
                <li><strong>Patrones de Dirección:</strong> Expresiones específicas para encontrar tu dirección</li>
                <li><strong>Patrones de Monto:</strong> Formatos específicos de totales en tus comprobantes</li>
                <li><strong>Patrones de Comprobante:</strong> Formatos de numeración de tus facturas/boletas</li>
              </ul>
              <div class="mt-4 p-3 bg-blue-100 rounded-md">
                <p class="text-sm">
                  <strong>💡 Consejo:</strong> Usa la función "Generar Automático" para crear una configuración basada en tus comprobantes procesados anteriormente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      <!-- Componente principal -->
      <ExtractionConfigManager />
  
      <!-- Modal de confirmación -->
      <TransitionRoot as="template" :show="showConfirmModal">
        <Dialog as="div" class="relative z-10" @close="showConfirmModal = false">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0"
            enter-to="opacity-100"
            leave="ease-in duration-200"
            leave-from="opacity-100"
            leave-to="opacity-0"
          >
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </TransitionChild>
  
          <div class="fixed inset-0 z-10 overflow-y-auto">
            <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <TransitionChild
                as="template"
                enter="ease-out duration-300"
                enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enter-to="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leave-from="opacity-100 translate-y-0 sm:scale-100"
                leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div class="sm:flex sm:items-start">
                      <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <ExclamationTriangleIcon class="h-6 w-6 text-red-600" aria-hidden="true" />
                      </div>
                      <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                        <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">
                          {{ confirmAction.title }}
                        </DialogTitle>
                        <div class="mt-2">
                          <p class="text-sm text-gray-500">
                            {{ confirmAction.message }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                      type="button"
                      class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                      @click="executeConfirmAction"
                    >
                      {{ confirmAction.confirmText }}
                    </button>
                    <button
                      type="button"
                      class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                      @click="showConfirmModal = false"
                      ref="cancelButtonRef"
                    >
                      Cancelar
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </TransitionRoot>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import ExtractionConfigManager from '@/components/admin/ExtractionConfigManager.vue'
  import {
    BuildingOfficeIcon,
    ChevronRightIcon,
    ArrowLeftIcon,
    QuestionMarkCircleIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon
  } from '@heroicons/vue/24/outline'
  import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
  
  // Props y stores
  const route = useRoute()
  const authStore = useAuthStore()
  
  // Estado reactivo
  const businessInfo = ref(null)
  const showHelp = ref(false)
  const showConfirmModal = ref(false)
  const confirmAction = ref({
    title: '',
    message: '',
    confirmText: '',
    action: null
  })
  
  // Computed
  const businessSlug = computed(() => route.params.businessSlug)
  const businessName = computed(() => businessInfo.value?.name || businessSlug.value)
  
  // Métodos
  const loadBusinessInfo = async () => {
    try {
      const token = await authStore.user.getIdToken()
      const response = await fetch(`/api/businesses/${businessSlug.value}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        businessInfo.value = data.business
      }
    } catch (error) {
      console.error('Error cargando información del negocio:', error)
    }
  }
  
  const executeConfirmAction = async () => {
    if (confirmAction.value.action) {
      await confirmAction.value.action()
    }
    showConfirmModal.value = false
  }
  
  // Lifecycle
  onMounted(() => {
    loadBusinessInfo()
  })
  
  // Proporcionar función para mostrar confirmaciones
  const showConfirmation = (title, message, confirmText, action) => {
    confirmAction.value = { title, message, confirmText, action }
    showConfirmModal.value = true
  }
  
  // Exportar para uso de componentes hijos
  defineExpose({
    showConfirmation
  })
  </script>
  
  <style scoped>
  .btn-secondary {
    @apply inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors;
  }
  </style>