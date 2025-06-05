<template>
  <div class="entity-stats-card">
    <div class="entity-header">
      <h4 class="entity-name">{{ entity.businessName }}</h4>
      <span class="ruc-badge">RUC: {{ entity.ruc }}</span>
    </div>
    
    <div class="entity-address" v-if="entity.address">
      <MapPin class="w-4 h-4 text-gray-500" />
      <span class="address-text">{{ entity.address }}</span>
    </div>
    
    <div class="entity-metrics">
      <div class="metric">
        <span class="metric-value">{{ stats.purchases || 0 }}</span>
        <span class="metric-label">Compras</span>
      </div>
      <div class="metric">
        <span class="metric-value">{{ formatCurrency(stats.revenue || 0) }}</span>
        <span class="metric-label">Ingresos</span>
      </div>
      <div class="metric">
        <span class="metric-value">{{ stats.customers || 0 }}</span>
        <span class="metric-label">Clientes</span>
      </div>
      <div class="metric">
        <span class="metric-value">{{ formatCurrency(stats.averageTicket || 0) }}</span>
        <span class="metric-label">Ticket Promedio</span>
      </div>
    </div>
    
    <div class="entity-locations" v-if="entity.locations?.length">
      <h5 class="locations-title">Ubicaciones:</h5>
      <div class="locations-list">
        <span 
          v-for="location in entity.locations" 
          :key="location"
          class="location-tag"
        >
          {{ location }}
        </span>
      </div>
    </div>

    <!-- Acciones rápidas -->
    <div class="entity-actions">
      <button 
        @click="$emit('view-details', entity)"
        class="action-btn view-btn"
      >
        Ver Detalles
      </button>
      <button 
        @click="$emit('edit-entity', entity)"
        class="action-btn edit-btn"
      >
        Editar
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MapPin } from 'lucide-vue-next'

const props = defineProps({
  entity: {
    type: Object,
    required: true
  },
  stats: {
    type: Object,
    default: () => ({
      purchases: 0,
      revenue: 0,
      customers: 0,
      averageTicket: 0
    })
  }
})

const emit = defineEmits(['view-details', 'edit-entity'])

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(amount)
}
</script>

<style scoped>
.entity-stats-card {
  @apply bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200;
}

.entity-header {
  @apply flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2;
}

.entity-name {
  @apply text-lg font-semibold text-gray-900 leading-tight;
}

.ruc-badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800;
}

.entity-address {
  @apply flex items-center gap-2 mb-4 text-sm text-gray-600;
}

.address-text {
  @apply flex-1 truncate;
}

.entity-metrics {
  @apply grid grid-cols-2 gap-4 mb-4;
}

.metric {
  @apply text-center;
}

.metric-value {
  @apply block text-2xl font-bold text-gray-900;
}

.metric-label {
  @apply text-sm text-gray-600;
}

.entity-locations {
  @apply mb-4;
}

.locations-title {
  @apply text-sm font-medium text-gray-700 mb-2;
}

.locations-list {
  @apply flex flex-wrap gap-1;
}

.location-tag {
  @apply inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700;
}

.entity-actions {
  @apply flex gap-2 pt-4 border-t border-gray-100;
}

.action-btn {
  @apply flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200;
}

.view-btn {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.edit-btn {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

/* Responsive adjustments */
@media (min-width: 1024px) {
  .entity-metrics {
    @apply grid-cols-4;
  }
}
</style>
