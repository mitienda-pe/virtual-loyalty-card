<template>
  <div class="revenue-chart">
    <div class="chart-header">
      <h3 class="chart-title">Ingresos por Período</h3>
      <div class="chart-controls">
        <EntityFilter 
          v-if="showEntityFilter && entities?.length > 1"
          :entities="entities"
          v-model="selectedEntity"
          @change="onEntityChange"
        />
        <div class="time-range-selector">
          <select v-model="selectedTimeRange" @change="onTimeRangeChange">
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 3 meses</option>
            <option value="1y">Último año</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="chart-container">
      <canvas ref="chartCanvas" class="chart-canvas"></canvas>
      
      <!-- Loading state -->
      <div v-if="loading" class="chart-loading">
        <div class="loading-spinner"></div>
        <p>Cargando datos...</p>
      </div>
      
      <!-- Empty state -->
      <div v-else-if="!hasData" class="chart-empty">
        <p>No hay datos de ingresos para mostrar</p>
        <p class="text-sm text-gray-500">
          {{ getEmptyStateMessage() }}
        </p>
      </div>
    </div>
    
    <!-- Chart summary -->
    <div v-if="hasData" class="chart-summary">
      <div class="summary-stats">
        <div class="stat-item">
          <span class="stat-label">Total del período:</span>
          <span class="stat-value">{{ formatCurrency(totalRevenue) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Promedio diario:</span>
          <span class="stat-value">{{ formatCurrency(dailyAverage) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Mejor día:</span>
          <span class="stat-value">{{ formatCurrency(bestDay) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import EntityFilter from '../business/EntityFilter.vue'

Chart.register(...registerables)

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  entityFilter: {
    type: String,
    default: 'all'
  },
  entities: {
    type: Array,
    default: () => []
  },
  showEntityFilter: {
    type: Boolean,
    default: true
  },
  businessSlug: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['entity-change', 'time-range-change'])

// Refs
const chartCanvas = ref(null)
const chart = ref(null)
const selectedEntity = ref(props.entityFilter)
const selectedTimeRange = ref('30d')
const loading = ref(false)

// Computed properties
const filteredData = computed(() => {
  let filtered = props.data

  // Filtrar por entidad si no es "all"
  if (selectedEntity.value && selectedEntity.value !== 'all') {
    filtered = filtered.filter(item => item.entityId === selectedEntity.value)
  }

  // Filtrar por rango de tiempo
  const now = new Date()
  const timeRanges = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  }
  
  const daysBack = timeRanges[selectedTimeRange.value] || 30
  const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
  
  filtered = filtered.filter(item => {
    const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date)
    return itemDate >= cutoffDate
  })

  return filtered
})

const hasData = computed(() => filteredData.value.length > 0)

const chartData = computed(() => {
  if (!hasData.value) return { labels: [], datasets: [] }

  // Agrupar datos por fecha
  const groupedByDate = filteredData.value.reduce((acc, item) => {
    const date = item.date?.toDate ? item.date.toDate() : new Date(item.date)
    const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
    
    if (!acc[dateKey]) {
      acc[dateKey] = 0
    }
    acc[dateKey] += item.amount || 0
    
    return acc
  }, {})

  // Ordenar fechas y crear arrays para el gráfico
  const sortedDates = Object.keys(groupedByDate).sort()
  const labels = sortedDates.map(date => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit'
    })
  })
  
  const data = sortedDates.map(date => groupedByDate[date])

  return {
    labels,
    datasets: [{
      label: 'Ingresos (S/)',
      data: data,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgb(59, 130, 246)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  }
})

const totalRevenue = computed(() => {
  return filteredData.value.reduce((sum, item) => sum + (item.amount || 0), 0)
})

const dailyAverage = computed(() => {
  if (!hasData.value) return 0
  
  const daysInRange = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  }
  
  const days = daysInRange[selectedTimeRange.value] || 30
  return totalRevenue.value / days
})

const bestDay = computed(() => {
  if (!hasData.value) return 0
  
  const dailyTotals = Object.values(
    filteredData.value.reduce((acc, item) => {
      const date = item.date?.toDate ? item.date.toDate() : new Date(item.date)
      const dateKey = date.toISOString().split('T')[0]
      
      if (!acc[dateKey]) {
        acc[dateKey] = 0
      }
      acc[dateKey] += item.amount || 0
      
      return acc
    }, {})
  )
  
  return Math.max(...dailyTotals, 0)
})

// Methods
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(amount || 0)
}

const getEmptyStateMessage = () => {
  if (selectedEntity.value && selectedEntity.value !== 'all') {
    const entity = props.entities.find(e => e.id === selectedEntity.value)
    return `No hay datos para ${entity?.businessName || 'la entidad seleccionada'} en este período`
  }
  return 'No hay ventas registradas en el período seleccionado'
}

const createChart = () => {
  if (!chartCanvas.value || !hasData.value) return

  const ctx = chartCanvas.value.getContext('2d')
  
  if (chart.value) {
    chart.value.destroy()
  }

  chart.value = new Chart(ctx, {
    type: 'line',
    data: chartData.value,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(59, 130, 246, 0.8)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return `Ingresos: ${formatCurrency(context.parsed.y)}`
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            maxTicksLimit: 8
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            callback: function(value) {
              return formatCurrency(value)
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart'
      }
    }
  })
}

const updateChart = () => {
  if (!chart.value) {
    createChart()
    return
  }

  chart.value.data = chartData.value
  chart.value.update('active')
}

const onEntityChange = (entityId) => {
  selectedEntity.value = entityId
  emit('entity-change', entityId)
}

const onTimeRangeChange = () => {
  emit('time-range-change', selectedTimeRange.value)
}

// Watchers
watch(chartData, () => {
  nextTick(() => {
    updateChart()
  })
}, { deep: true })

watch(() => props.data, () => {
  nextTick(() => {
    updateChart()
  })
}, { deep: true })

// Lifecycle
onMounted(() => {
  nextTick(() => {
    createChart()
  })
})
</script>

<style scoped>
.revenue-chart {
  @apply bg-white border border-gray-200 rounded-lg p-6;
}

.chart-header {
  @apply flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4;
}

.chart-title {
  @apply text-lg font-semibold text-gray-900;
}

.chart-controls {
  @apply flex flex-col sm:flex-row gap-3;
}

.time-range-selector select {
  @apply px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.chart-container {
  @apply relative h-80 mb-4;
}

.chart-canvas {
  @apply w-full h-full;
}

.chart-loading {
  @apply absolute inset-0 flex flex-col items-center justify-center bg-gray-50 rounded;
}

.loading-spinner {
  @apply w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3;
}

.chart-empty {
  @apply absolute inset-0 flex flex-col items-center justify-center text-gray-500;
}

.chart-summary {
  @apply border-t border-gray-200 pt-4;
}

.summary-stats {
  @apply grid grid-cols-1 sm:grid-cols-3 gap-4;
}

.stat-item {
  @apply text-center;
}

.stat-label {
  @apply block text-sm text-gray-600 mb-1;
}

.stat-value {
  @apply block text-lg font-semibold text-gray-900;
}
</style>
