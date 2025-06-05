<template>
  <div class="loyalty-programs-manager">
    <!-- Header -->
    <div class="page-header mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Programas de Lealtad</h1>
          <p class="text-gray-600 mt-1">Gestiona los programas de fidelización para tu negocio</p>
        </div>
        <button 
          @click="showCreateProgram = true" 
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <PlusIcon class="w-5 h-5" />
          Crear Nuevo Programa
        </button>
      </div>
    </div>
    
    <!-- Estadísticas Generales -->
    <div class="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <div class="stat-card bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-600">Programas Activos</h3>
        <span class="text-2xl font-bold text-blue-600">{{ stats.activePrograms }}</span>
      </div>
      <div class="stat-card bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-600">Total Participantes</h3>
        <span class="text-2xl font-bold text-green-600">{{ formatNumber(stats.totalParticipants) }}</span>
      </div>
      <div class="stat-card bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-600">Canjes Totales</h3>
        <span class="text-2xl font-bold text-purple-600">{{ formatNumber(stats.totalRedemptions) }}</span>
      </div>
      <div class="stat-card bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-600">Ingresos Generados</h3>
        <span class="text-2xl font-bold text-orange-600">{{ formatCurrency(stats.totalRevenue) }}</span>
      </div>
      <div class="stat-card bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-600">Total Programas</h3>
        <span class="text-2xl font-bold text-gray-600">{{ stats.totalPrograms }}</span>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="text-gray-600 mt-2">Cargando programas...</p>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div class="flex">
        <ExclamationTriangleIcon class="h-5 w-5 text-red-400" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Error</h3>
          <p class="text-sm text-red-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="programs.length === 0" class="text-center py-12 bg-white rounded-lg border border-gray-200">
      <GiftIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">No hay programas de lealtad</h3>
      <p class="mt-1 text-sm text-gray-500">Comienza creando tu primer programa de fidelización.</p>
      <div class="mt-6">
        <button 
          @click="showCreateProgram = true"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Crear Primer Programa
        </button>
      </div>
    </div>
    
    <!-- Lista de Programas -->
    <div v-else class="programs-section">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-medium text-gray-900">Orden de Prioridad</h2>
            <div class="text-sm text-gray-500">
              Arrastra para reordenar • Los programas se evalúan por prioridad
            </div>
          </div>
        </div>
        
        <div class="p-6">
          <draggable 
            v-model="sortedPrograms" 
            @end="handlePriorityChange"
            item-key="id"
            class="space-y-4"
            handle=".drag-handle"
          >
            <template #item="{element: program}">
              <ProgramCard
                :program="program"
                :can-delete="programs.length > 1"
                @edit="editProgram"
                @delete="deleteProgram"
                @toggle-status="toggleProgramStatus"
                @view-details="viewProgramDetails"
              />
            </template>
          </draggable>
        </div>
      </div>
    </div>
    
    <!-- Modal de Creación/Edición -->
    <ProgramModal 
      v-if="showCreateProgram || editingProgram"
      :program="editingProgram"
      :is-editing="!!editingProgram"
      @save="saveProgram"
      @cancel="cancelEdit"
    />
    
    <!-- Modal de Detalles -->
    <ProgramDetailsModal
      v-if="showingProgramDetails"
      :program="showingProgramDetails"
      @close="showingProgramDetails = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLoyaltyPrograms } from '@/composables/useLoyaltyPrograms'
import draggable from 'vuedraggable'
import { 
  PlusIcon, 
  GiftIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/vue/24/outline'

// Importar componentes
import ProgramCard from './ProgramCard.vue'
import ProgramModal from './ProgramModal.vue'
import ProgramDetailsModal from './ProgramDetailsModal.vue'

const authStore = useAuthStore()

// Estado local
const showCreateProgram = ref(false)
const editingProgram = ref(null)
const showingProgramDetails = ref(null)

// Usar el composable
const {
  programs,
  loading,
  error,
  stats,
  sortedPrograms,
  initialize,
  createProgram,
  updateProgram,
  deleteProgram: deleteProgramService,
  updateProgramPriorities,
  toggleProgramStatus: toggleStatus,
  refresh
} = useLoyaltyPrograms(authStore.businessId)

// Computed properties
const businessSlug = computed(() => authStore.businessId)

// Métodos
const editProgram = (program) => {
  editingProgram.value = { ...program }
  showCreateProgram.value = true
}

const deleteProgram = async (program) => {
  if (!confirm(`¿Estás seguro de que quieres eliminar el programa "${program.name}"?`)) {
    return
  }

  try {
    await deleteProgramService(program.id)
    // Mostrar notificación de éxito
    console.log('Programa eliminado exitosamente')
  } catch (error) {
    console.error('Error eliminando programa:', error)
    alert('Error al eliminar el programa: ' + error.message)
  }
}

const toggleProgramStatus = async (program) => {
  try {
    await toggleStatus(program.id)
    // Mostrar notificación de éxito
    console.log('Estado del programa actualizado')
  } catch (error) {
    console.error('Error actualizando estado:', error)
    alert('Error al actualizar el estado: ' + error.message)
  }
}

const viewProgramDetails = (program) => {
  showingProgramDetails.value = program
}

const saveProgram = async (programData) => {
  try {
    if (editingProgram.value) {
      await updateProgram(editingProgram.value.id, programData)
    } else {
      await createProgram(programData)
    }
    
    cancelEdit()
    // Mostrar notificación de éxito
    console.log('Programa guardado exitosamente')
  } catch (error) {
    console.error('Error guardando programa:', error)
    throw error // Dejar que el modal maneje el error
  }
}

const cancelEdit = () => {
  showCreateProgram.value = false
  editingProgram.value = null
}

const handlePriorityChange = async () => {
  try {
    // Crear actualizaciones de prioridad basadas en el nuevo orden
    const priorityUpdates = sortedPrograms.value.map((program, index) => ({
      id: program.id,
      priority: index + 1
    }))
    
    await updateProgramPriorities(priorityUpdates)
    console.log('Prioridades actualizadas exitosamente')
  } catch (error) {
    console.error('Error actualizando prioridades:', error)
    // Revertir cambios locales
    await refresh()
    alert('Error al actualizar las prioridades: ' + error.message)
  }
}

// Utilidades de formato
const formatNumber = (value) => {
  return new Intl.NumberFormat('es-PE').format(value || 0)
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(value || 0)
}

// Watchers
watch(() => authStore.businessId, (newBusinessId) => {
  if (newBusinessId) {
    initialize()
  }
})

// Lifecycle
onMounted(() => {
  if (authStore.businessId) {
    initialize()
  }
})
</script>

<style scoped>
.loyalty-programs-manager {
  @apply p-6;
}

.page-header {
  @apply pb-6 border-b border-gray-200;
}

.stats-grid .stat-card {
  @apply hover:shadow-md transition-shadow duration-200;
}

.programs-section {
  @apply space-y-6;
}

/* Drag and drop styles */
.sortable-ghost {
  @apply opacity-50;
}

.sortable-drag {
  @apply shadow-lg;
}
</style>