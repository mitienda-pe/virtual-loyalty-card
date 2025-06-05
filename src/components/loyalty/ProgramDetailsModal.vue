<template>
  <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="modal-header bg-blue-600 text-white p-6 rounded-t-lg">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">{{ program.name }}</h2>
          <button @click="$emit('close')" class="text-white hover:text-gray-200">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <!-- Body -->
      <div class="modal-body p-6 space-y-6">
        <!-- Información General -->
        <div class="section">
          <h3 class="text-lg font-medium text-gray-900 mb-3">Información General</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-600">Tipo:</span>
              <span class="ml-2">{{ getProgramTypeLabel(program.type) }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-600">Estado:</span>
              <span class="ml-2" :class="getStatusClass(program.status)">
                {{ getStatusLabel(program.status) }}
              </span>
            </div>
            <div>
              <span class="font-medium text-gray-600">Prioridad:</span>
              <span class="ml-2">{{ program.priority || 'Sin asignar' }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-600">Vigencia:</span>
              <span class="ml-2">{{ formatDateRange(program.startDate, program.endDate) }}</span>
            </div>
          </div>
          <div v-if="program.description" class="mt-3">
            <span class="font-medium text-gray-600">Descripción:</span>
            <p class="mt-1 text-gray-900">{{ program.description }}</p>
          </div>
        </div>
        
        <!-- Configuración del Programa -->
        <div class="section">
          <h3 class="text-lg font-medium text-gray-900 mb-3">Configuración</h3>
          
          <div v-if="program.type === 'visits'" class="config-details">
            <p><strong>Visitas requeridas:</strong> {{ program.config.target }}</p>
            <p><strong>Recompensa:</strong> {{ program.config.reward }}</p>
          </div>
          
          <div v-else-if="program.type === 'specific_product'" class="config-details">
            <p><strong>Productos requeridos:</strong> {{ program.config.target }}</p>
            <p><strong>Recompensa:</strong> {{ program.config.reward }}</p>
            <div class="mt-2">
              <strong>Palabras clave:</strong>
              <div class="flex flex-wrap gap-1 mt-1">
                <span 
                  v-for="keyword in program.config.productKeywords" 
                  :key="keyword"
                  class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                >
                  {{ keyword }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-else-if="program.type === 'ticket_value'" class="config-details">
            <p><strong>Tickets requeridos:</strong> {{ program.config.target }}</p>
            <p><strong>Valor mínimo:</strong> {{ formatCurrency(program.config.minTicketValue) }}</p>
            <p><strong>Recompensa:</strong> {{ program.config.reward }}</p>
          </div>
          
          <div v-else-if="program.type === 'points'" class="config-details">
            <p><strong>Puntos por sol:</strong> {{ program.config.pointsPerDollar }}</p>
            <div class="mt-2">
              <strong>Niveles de recompensa:</strong>
              <div class="mt-1 space-y-1">
                <div 
                  v-for="reward in program.config.rewards" 
                  :key="reward.points"
                  class="flex justify-between items-center py-1 px-2 bg-gray-100 rounded"
                >
                  <span>{{ reward.reward }}</span>
                  <span class="font-medium">{{ reward.points }} puntos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Estadísticas -->
        <div class="section">
          <h3 class="text-lg font-medium text-gray-900 mb-3">Estadísticas</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="stat-item">
              <div class="text-2xl font-bold text-blue-600">{{ formatNumber(program.stats?.totalParticipants || 0) }}</div>
              <div class="text-sm text-gray-600">Participantes</div>
            </div>
            <div class="stat-item">
              <div class="text-2xl font-bold text-green-600">{{ formatNumber(program.stats?.rewardsRedeemed || 0) }}</div>
              <div class="text-sm text-gray-600">Canjes</div>
            </div>
            <div class="stat-item">
              <div class="text-2xl font-bold text-purple-600">{{ formatCurrency(program.stats?.totalRevenue || 0) }}</div>
              <div class="text-sm text-gray-600">Ingresos</div>
            </div>
            <div class="stat-item">
              <div class="text-2xl font-bold text-orange-600">{{ getConversionRate(program) }}%</div>
              <div class="text-sm text-gray-600">Conversión</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="modal-footer bg-gray-50 px-6 py-4 rounded-b-lg">
        <div class="flex justify-end">
          <button 
            @click="$emit('close')" 
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  program: {
    type: Object,
    required: true
  }
})

defineEmits(['close'])

// Métodos de utilidad
const getProgramTypeLabel = (type) => {
  const labels = {
    'visits': 'Por Visitas',
    'specific_product': 'Por Producto Específico',
    'ticket_value': 'Por Valor de Ticket',
    'points': 'Por Puntos'
  }
  return labels[type] || type
}

const getStatusLabel = (status) => {
  const labels = {
    'active': 'Activo',
    'paused': 'Pausado',
    'ended': 'Finalizado'
  }
  return labels[status] || status
}

const getStatusClass = (status) => {
  const classes = {
    'active': 'text-green-600',
    'paused': 'text-yellow-600',
    'ended': 'text-gray-600'
  }
  return classes[status] || 'text-gray-600'
}

const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return 'Sin restricción'
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  } else if (startDate) {
    return `Desde ${formatDate(startDate)}`
  } else if (endDate) {
    return `Hasta ${formatDate(endDate)}`
  }
  
  return 'Sin restricción'
}

const getConversionRate = (program) => {
  const participants = program.stats?.totalParticipants || 0
  const redemptions = program.stats?.rewardsRedeemed || 0
  
  if (participants === 0) return 0
  return ((redemptions / participants) * 100).toFixed(1)
}

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
</script>

<style scoped>
.modal-overlay {
  backdrop-filter: blur(4px);
}

.section {
  @apply border border-gray-200 rounded-lg p-4 bg-gray-50;
}

.config-details {
  @apply space-y-2;
}

.config-details p {
  @apply text-sm;
}

.stat-item {
  @apply text-center p-3 bg-white rounded border border-gray-200;
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