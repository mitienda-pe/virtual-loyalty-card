<template>
  <div class="program-card" :class="{ 'inactive': program.status !== 'active' }">
    <!-- Drag Handle -->
    <div class="drag-handle">
      <Bars3Icon class="w-5 h-5 text-gray-400" />
    </div>
    
    <div class="program-content">
      <!-- Header -->
      <div class="program-header">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <h3 class="program-name">{{ program.name }}</h3>
              <span class="program-type-badge" :class="getTypeBadgeClass(program.type)">
                {{ getProgramTypeLabel(program.type) }}
              </span>
              <span v-if="program.status !== 'active'" class="status-badge">
                {{ program.status === 'paused' ? 'Pausado' : 'Inactivo' }}
              </span>
            </div>
            
            <p class="program-description">{{ program.description || 'Sin descripción' }}</p>
          </div>
        </div>
      </div>
      
      <!-- Program Details -->
      <div class="program-details">
        <div class="detail-item">
          <ArrowRightCircleIcon class="w-4 h-4 text-gray-500" />
          <span>{{ getProgramTargetText(program) }}</span>
        </div>
        
        <div class="detail-item">
          <GiftIcon class="w-4 h-4 text-gray-500" />
          <span>{{ getRewardText(program) }}</span>
        </div>
        
        <div class="detail-item" v-if="program.startDate || program.endDate">
          <CalendarIcon class="w-4 h-4 text-gray-500" />
          <span>{{ formatDateRange(program.startDate, program.endDate) }}</span>
        </div>
        
        <div class="detail-item" v-if="program.priority">
          <HashtagIcon class="w-4 h-4 text-gray-500" />
          <span>Prioridad {{ program.priority }}</span>
        </div>
      </div>
      
      <!-- Program Stats -->
      <div class="program-stats">
        <div class="stat">
          <span class="stat-value">{{ formatNumber(program.stats?.totalParticipants || 0) }}</span>
          <span class="stat-label">Participantes</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ formatNumber(program.stats?.rewardsRedeemed || 0) }}</span>
          <span class="stat-label">Canjes</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ formatCurrency(program.stats?.totalRevenue || 0) }}</span>
          <span class="stat-label">Ingresos</span>
        </div>
        <div class="stat" v-if="program.stats?.totalParticipants > 0">
          <span class="stat-value">{{ getConversionRate(program) }}%</span>
          <span class="stat-label">Conversión</span>
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="program-actions">
      <button 
        @click="$emit('view-details', program)" 
        class="action-btn view-btn"
        title="Ver detalles"
      >
        <EyeIcon class="w-4 h-4" />
      </button>
      
      <button 
        @click="$emit('edit', program)" 
        class="action-btn edit-btn"
        title="Editar programa"
      >
        <PencilIcon class="w-4 h-4" />
      </button>
      
      <button 
        @click="$emit('toggle-status', program)" 
        :class="getStatusButtonClass(program)"
        :title="program.status === 'active' ? 'Pausar programa' : 'Activar programa'"
      >
        <component :is="getStatusIcon(program)" class="w-4 h-4" />
      </button>
      
      <button 
        @click="$emit('delete', program)" 
        class="action-btn delete-btn"
        title="Eliminar programa"
        :disabled="!canDelete"
      >
        <TrashIcon class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Bars3Icon,
  ArrowRightCircleIcon,
  GiftIcon,
  CalendarIcon,
  HashtagIcon,
  EyeIcon,
  PencilIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  program: {
    type: Object,
    required: true
  },
  canDelete: {
    type: Boolean,
    default: true
  }
})

defineEmits(['edit', 'delete', 'toggle-status', 'view-details'])

// Computed properties
const getProgramTypeLabel = (type) => {
  const labels = {
    'visits': 'Por Visitas',
    'specific_product': 'Por Producto',
    'ticket_value': 'Por Valor',
    'points': 'Por Puntos'
  }
  return labels[type] || type
}

const getTypeBadgeClass = (type) => {
  const classes = {
    'visits': 'type-visits',
    'specific_product': 'type-product',
    'ticket_value': 'type-value',
    'points': 'type-points'
  }
  return classes[type] || 'type-default'
}

const getProgramTargetText = (program) => {
  if (!program || !program.config) return 'N/A'

  switch (program.type) {
    case 'visits':
      return `${program.config.target} visitas`
    case 'specific_product':
      return `${program.config.target} productos específicos`
    case 'ticket_value':
      return `${program.config.target} compras de S/${program.config.minTicketValue}+`
    case 'points':
      return `Sistema de puntos (${program.config.pointsPerDollar} pts/S/)`
    default:
      return 'N/A'
  }
}

const getRewardText = (program) => {
  if (!program || !program.config) return 'N/A'

  switch (program.type) {
    case 'visits':
    case 'specific_product':
    case 'ticket_value':
      return program.config.reward || 'N/A'
    case 'points':
      const rewards = program.config.rewards || []
      if (rewards.length === 0) return 'Sin recompensas'
      if (rewards.length === 1) return rewards[0].reward
      return `${rewards.length} niveles de recompensa`
    default:
      return 'N/A'
  }
}

const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return 'Sin restricción'
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short'
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

const getStatusButtonClass = (program) => {
  return program.status === 'active' 
    ? 'action-btn pause-btn' 
    : 'action-btn play-btn'
}

const getStatusIcon = (program) => {
  return program.status === 'active' ? PauseIcon : PlayIcon
}

// Utilidades de formato
const formatNumber = (value) => {
  return new Intl.NumberFormat('es-PE').format(value || 0)
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0)
}
</script>

<style scoped>
.program-card {
  @apply bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 flex items-start gap-4;
}

.program-card.inactive {
  @apply bg-gray-50 border-gray-300;
}

.drag-handle {
  @apply cursor-move flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 flex-shrink-0;
}

.program-content {
  @apply flex-1 min-w-0;
}

.program-header {
  @apply mb-4;
}

.program-name {
  @apply text-lg font-semibold text-gray-900;
}

.program-description {
  @apply text-sm text-gray-600 mt-1;
}

.program-type-badge {
  @apply px-2 py-1 text-xs font-medium rounded;
}

.type-visits {
  @apply bg-blue-100 text-blue-800;
}

.type-product {
  @apply bg-green-100 text-green-800;
}

.type-value {
  @apply bg-purple-100 text-purple-800;
}

.type-points {
  @apply bg-orange-100 text-orange-800;
}

.status-badge {
  @apply px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800;
}

.program-details {
  @apply space-y-2 mb-4;
}

.detail-item {
  @apply flex items-center gap-2 text-sm text-gray-600;
}

.program-stats {
  @apply grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100;
}

.stat {
  @apply text-center;
}

.stat-value {
  @apply block text-lg font-semibold text-gray-900;
}

.stat-label {
  @apply text-xs text-gray-500 uppercase tracking-wide;
}

.program-actions {
  @apply flex flex-col gap-2 flex-shrink-0;
}

.action-btn {
  @apply p-2 rounded-md transition-colors duration-200;
}

.view-btn {
  @apply bg-gray-100 text-gray-600 hover:bg-gray-200;
}

.edit-btn {
  @apply bg-blue-100 text-blue-600 hover:bg-blue-200;
}

.play-btn {
  @apply bg-green-100 text-green-600 hover:bg-green-200;
}

.pause-btn {
  @apply bg-yellow-100 text-yellow-600 hover:bg-yellow-200;
}

.delete-btn {
  @apply bg-red-100 text-red-600 hover:bg-red-200;
}

.delete-btn:disabled {
  @apply bg-gray-100 text-gray-400 cursor-not-allowed;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .program-card {
    @apply flex-col;
  }
  
  .program-actions {
    @apply flex-row justify-end;
  }
  
  .program-stats {
    @apply grid-cols-2;
  }
}
</style>