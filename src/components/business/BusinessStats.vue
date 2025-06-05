<template>
  <div class="business-stats">
    <!-- Estadísticas consolidadas -->
    <div class="consolidated-stats">
      <div class="stats-header">
        <h3 class="stats-title">Resumen General</h3>
        <div class="update-indicator" v-if="loading">
          <Loader2 class="w-4 h-4 animate-spin" />
          <span>Actualizando...</span>
        </div>
      </div>
      
      <div class="stats-grid">
        <StatCard 
          title="Total Entidades"
          :value="business.businessEntities?.length || 1"
          icon="building"
          color="blue"
        />
        <StatCard 
          title="Compras Consolidadas"
          :value="consolidatedStats.totalPurchases"
          icon="shopping-cart"
          color="green"
        />
        <StatCard 
          title="Ingresos Consolidados"
          :value="formatCurrency(consolidatedStats.totalRevenue)"
          icon="dollar-sign"
          color="purple"
        />
        <StatCard 
          title="Clientes Únicos"
          :value="consolidatedStats.uniqueCustomers"
          icon="users"
          color="orange"
        />
      </div>
    </div>

    <!-- Desglose por entidad (solo si hay múltiples entidades) -->
    <div class="entity-breakdown" v-if="hasMultipleEntities">
      <div class="breakdown-header">
        <h3 class="breakdown-title">Desglose por Entidad</h3>
        <div class="view-options">
          <button 
            @click="viewMode = 'grid'"
            :class="['view-btn', { active: viewMode === 'grid' }]"
          >
            <Grid3X3 class="w-4 h-4" />
            Tarjetas
          </button>
          <button 
            @click="viewMode = 'table'"
            :class="['view-btn', { active: viewMode === 'table' }]"
          >
            <Table class="w-4 h-4" />
            Tabla
          </button>
        </div>
      </div>
      
      <!-- Vista en tarjetas -->
      <div v-if="viewMode === 'grid'" class="entities-grid">
        <EntityStatsCard 
          v-for="entity in business.businessEntities"
          :key="entity.id"
          :entity="entity"
          :stats="getEntityStats(entity.id)"
          @view-details="handleViewEntityDetails"
          @edit-entity="handleEditEntity"
        />
      </div>

      <!-- Vista en tabla -->
      <div v-else class="entities-table-container">
        <table class="entities-table">
          <thead>
            <tr>
              <th>Razón Social</th>
              <th>RUC</th>
              <th>Dirección</th>
              <th>Compras</th>
              <th>Ingresos</th>
              <th>Clientes</th>
              <th>Ticket Promedio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entity in business.businessEntities" :key="entity.id">
              <td class="entity-name">{{ entity.businessName }}</td>
              <td class="entity-ruc">{{ entity.ruc }}</td>
              <td class="entity-address">{{ truncateText(entity.address, 30) }}</td>
              <td class="metric-cell">{{ getEntityStats(entity.id).purchases || 0 }}</td>
              <td class="metric-cell">{{ formatCurrency(getEntityStats(entity.id).revenue || 0) }}</td>
              <td class="metric-cell">{{ getEntityStats(entity.id).customers || 0 }}</td>
              <td class="metric-cell">{{ formatCurrency(getEntityStats(entity.id).averageTicket || 0) }}</td>
              <td class="actions-cell">
                <button 
                  @click="handleViewEntityDetails(entity)"
                  class="table-action-btn view"
                  title="Ver detalles"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button 
                  @click="handleEditEntity(entity)"
                  class="table-action-btn edit"
                  title="Editar"
                >
                  <Edit class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Métricas de rendimiento -->
    <div class="performance-metrics" v-if="performanceData">
      <h3 class="performance-title">Métricas de Rendimiento</h3>
      <div class="performance-grid">
        <div class="performance-card">
          <div class="performance-header">
            <TrendingUp class="w-5 h-5 text-green-600" />
            <span>Crecimiento Mensual</span>
          </div>
          <div class="performance-value">
            {{ formatPercentage(performanceData.monthlyGrowth) }}
          </div>
        </div>
        
        <div class="performance-card">
          <div class="performance-header">
            <Target class="w-5 h-5 text-blue-600" />
            <span>Tasa de Retención</span>
          </div>
          <div class="performance-value">
            {{ formatPercentage(performanceData.retentionRate) }}
          </div>
        </div>
        
        <div class="performance-card">
          <div class="performance-header">
            <Calendar class="w-5 h-5 text-purple-600" />
            <span>Frecuencia Promedio</span>
          </div>
          <div class="performance-value">
            {{ performanceData.averageFrequency }} días
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { 
  Building, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Grid3X3, 
  Table, 
  Eye, 
  Edit, 
  TrendingUp, 
  Target, 
  Calendar,
  Loader2 
} from 'lucide-vue-next'
import EntityStatsCard from './EntityStatsCard.vue'
import StatCard from './StatCard.vue'
import { useBusinessMetrics } from '@/composables/useBusinessMetrics'

const props = defineProps({
  business: {
    type: Object,
    required: true
  },
  refreshTrigger: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['view-entity-details', 'edit-entity'])

// Estado local
const viewMode = ref('grid') // 'grid' o 'table'
const loading = ref(false)

// Composable para métricas
const { 
  consolidatedMetrics, 
  entityMetrics, 
  performanceMetrics,
  fetchMetrics,
  loading: metricsLoading 
} = useBusinessMetrics(props.business.slug)

// Computed properties
const hasMultipleEntities = computed(() => {
  return props.business.businessEntities?.length > 1
})

const consolidatedStats = computed(() => {
  return consolidatedMetrics.value || {
    totalPurchases: 0,
    totalRevenue: 0,
    uniqueCustomers: 0
  }
})

const performanceData = computed(() => {
  return performanceMetrics.value
})

// Métodos
const getEntityStats = (entityId) => {
  return entityMetrics.value?.[entityId] || {
    purchases: 0,
    revenue: 0,
    customers: 0,
    averageTicket: 0
  }
}

const handleViewEntityDetails = (entity) => {
  emit('view-entity-details', entity)
}

const handleEditEntity = (entity) => {
  emit('edit-entity', entity)
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatPercentage = (value) => {
  return `${(value * 100).toFixed(1)}%`
}

const truncateText = (text, maxLength) => {
  if (!text) return 'N/A'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// Watchers
watch(() => props.refreshTrigger, () => {
  fetchMetrics()
})

watch(metricsLoading, (newValue) => {
  loading.value = newValue
})

// Inicialización
fetchMetrics()
</script>

<style scoped>
.business-stats {
  @apply space-y-8;
}

/* Estadísticas consolidadas */
.consolidated-stats {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
}

.stats-header {
  @apply flex items-center justify-between mb-6;
}

.stats-title {
  @apply text-xl font-semibold text-gray-900;
}

.update-indicator {
  @apply flex items-center gap-2 text-sm text-gray-600;
}

.stats-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

/* Desglose por entidad */
.entity-breakdown {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
}

.breakdown-header {
  @apply flex items-center justify-between mb-6;
}

.breakdown-title {
  @apply text-xl font-semibold text-gray-900;
}

.view-options {
  @apply flex rounded-lg border border-gray-300 p-1;
}

.view-btn {
  @apply flex items-center gap-2 px-3 py-1 text-sm font-medium rounded transition-colors duration-200;
}

.view-btn:not(.active) {
  @apply text-gray-600 hover:text-gray-900;
}

.view-btn.active {
  @apply bg-blue-600 text-white;
}

/* Vista en tarjetas */
.entities-grid {
  @apply grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6;
}

/* Vista en tabla */
.entities-table-container {
  @apply overflow-x-auto;
}

.entities-table {
  @apply min-w-full divide-y divide-gray-200;
}

.entities-table th {
  @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50;
}

.entities-table td {
  @apply px-6 py-4 whitespace-nowrap text-sm;
}

.entity-name {
  @apply font-medium text-gray-900;
}

.entity-ruc {
  @apply text-gray-600 font-mono;
}

.entity-address {
  @apply text-gray-600;
}

.metric-cell {
  @apply text-gray-900 font-medium;
}

.actions-cell {
  @apply flex items-center gap-2;
}

.table-action-btn {
  @apply p-1 rounded hover:bg-gray-100 transition-colors duration-200;
}

.table-action-btn.view {
  @apply text-gray-600 hover:text-blue-600;
}

.table-action-btn.edit {
  @apply text-gray-600 hover:text-green-600;
}

/* Métricas de rendimiento */
.performance-metrics {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
}

.performance-title {
  @apply text-xl font-semibold text-gray-900 mb-6;
}

.performance-grid {
  @apply grid grid-cols-1 md:grid-cols-3 gap-4;
}

.performance-card {
  @apply bg-gray-50 rounded-lg p-4;
}

.performance-header {
  @apply flex items-center gap-2 mb-2;
}

.performance-header span {
  @apply text-sm font-medium text-gray-700;
}

.performance-value {
  @apply text-2xl font-bold text-gray-900;
}
</style>
