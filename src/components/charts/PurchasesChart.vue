<template>
  <div class="purchases-chart">
    <div class="chart-header">
      <h3 class="text-lg font-semibold text-gray-900">Compras por Período</h3>
      <div class="chart-controls">
        <EntitySelector 
          v-if="showEntityFilter && entities.length > 1"
          :entities="entities"
          v-model="selectedEntity"
          @change="updateChart"
          class="mb-4"
        />
        <div class="chart-type-selector">
          <button 
            v-for="type in chartTypes"
            :key="type.value"
            @click="selectedChartType = type.value"
            :class="[
              'px-3 py-1 text-sm rounded-md mr-2',
              selectedChartType === type.value 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            ]"
          >
            {{ type.label }}
          </button>
        </div>
      </div>
    </div>
    
    <div class="chart-container" :class="{ 'loading': loading }">
      <canvas ref="chartCanvas" width="400" height="200"></canvas>
      
      <div v-if="loading" class="chart-loading">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span class="ml-2 text-gray-600">Cargando datos...</span>
      </div>
      
      <div v-if="error" class="chart-error">
        <p class="text-red-600">Error al cargar los datos del gráfico</p>
        <button @click="updateChart" class="text-green-600 hover:underline">Reintentar</button>
      </div>
    </div>

    <!-- Estadísticas adicionales -->
    <div v-if="chartStats" class="chart-stats mt-4">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Total Compras</span>
          <span class="stat-value">{{ chartStats.totalPurchases }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Promedio Diario</span>
          <span class="stat-value">{{ chartStats.dailyAverage }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Día Pico</span>
          <span class="stat-value">{{ chartStats.peakDay }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import EntitySelector from '../business/EntitySelector.vue'

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
  period: {
    type: String,
    default: '30d'
  }
})

const emit = defineEmits(['entity-change', 'chart-type-change'])

// Refs
const chartCanvas = ref(null)
const chart = ref(null)
const loading = ref(false)
const error = ref(null)
const selectedEntity = ref(props.entityFilter)
const selectedChartType = ref('bar')

// Tipos de gráfico disponibles
const chartTypes = [
  { label: 'Barras', value: 'bar' },
  { label: 'Línea', value: 'line' },
  { label: 'Área', value: 'area' }
]

// Colores para las entidades
const entityColors = [
  '#10B981', '#3B82F6', '#EF4444', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#6B7280', '#84CC16'
]

// Datos filtrados
const filteredData = computed(() => {
  if (!props.data || props.data.length === 0) return []
  
  if (!selectedEntity.value || selectedEntity.value === 'all') {
    return props.data
  }
  
  return props.data.filter(item => item.entityId === selectedEntity.value)
})

// Datos preparados para el gráfico
const chartData = computed(() => {
  if (!filteredData.value || filteredData.value.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }

  if (selectedEntity.value === 'all' && props.entities.length > 1) {
    return createMultiEntityChartData()
  } else {
    return createSingleEntityChartData()
  }
})

// Crear datos para una sola entidad
const createSingleEntityChartData = () => {
  const processedData = processDataByPeriod(filteredData.value)
  
  const baseConfig = {
    label: 'Compras',
    data: processedData.map(item => item.purchases),
    borderColor: entityColors[0],
    borderWidth: 2
  }

  if (selectedChartType.value === 'bar') {
    baseConfig.backgroundColor = entityColors[0] + '80'
  } else if (selectedChartType.value === 'area') {
    baseConfig.backgroundColor = entityColors[0] + '30'
    baseConfig.fill = true
    baseConfig.tension = 0.4
  } else {
    baseConfig.backgroundColor = 'transparent'
    baseConfig.fill = false
    baseConfig.tension = 0.4
  }
  
  return {
    labels: processedData.map(item => formatDate(item.date)),
    datasets: [baseConfig]
  }
}

// Crear datos para múltiples entidades
const createMultiEntityChartData = () => {
  const entityData = {}
  const allDates = new Set()

  // Agrupar datos por entidad
  props.entities.forEach(entity => {
    const entityPurchases = props.data.filter(item => item.entityId === entity.id)
    entityData[entity.id] = processDataByPeriod(entityPurchases)
    entityData[entity.id].forEach(item => allDates.add(item.date))
  })

  const sortedDates = Array.from(allDates).sort()
  const labels = sortedDates.map(date => formatDate(date))

  const datasets = props.entities.map((entity, index) => {
    const data = sortedDates.map(date => {
      const dayData = entityData[entity.id]?.find(item => item.date === date)
      return dayData ? dayData.purchases : 0
    })

    const baseConfig = {
      label: entity.businessName,
      data,
      borderColor: entityColors[index % entityColors.length],
      borderWidth: 2
    }

    if (selectedChartType.value === 'bar') {
      baseConfig.backgroundColor = entityColors[index % entityColors.length] + '80'
    } else if (selectedChartType.value === 'area') {
      baseConfig.backgroundColor = entityColors[index % entityColors.length] + '30'
      baseConfig.fill = true
      baseConfig.tension = 0.4
    } else {
      baseConfig.backgroundColor = 'transparent'
      baseConfig.fill = false
      baseConfig.tension = 0.4
    }

    return baseConfig
  })

  return { labels, datasets }
}

// Procesar datos por período
const processDataByPeriod = (data) => {
  const now = new Date()
  const periodDays = getPeriodDays(props.period)
  const startDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000))

  const filteredByPeriod = data.filter(item => {
    const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date)
    return itemDate >= startDate
  })

  const dailyStats = {}
  filteredByPeriod.forEach(item => {
    const date = item.date?.toDate ? item.date.toDate() : new Date(item.date)
    const dayKey = date.toISOString().split('T')[0]
    
    if (!dailyStats[dayKey]) {
      dailyStats[dayKey] = { date: dayKey, purchases: 0, customers: new Set() }
    }
    
    dailyStats[dayKey].purchases++
    dailyStats[dayKey].customers.add(item.phoneNumber)
  })

  return Object.values(dailyStats)
    .map(day => ({
      ...day,
      customers: day.customers.size
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

// Obtener días del período
const getPeriodDays = (period) => {
  switch (period) {
    case '7d': return 7
    case '30d': return 30
    case '90d': return 90
    case '1y': return 365
    default: return 30
  }
}

// Formatear fecha
const formatDate = (dateString) => {
  const date = new Date(dateString)
  const period = props.period
  
  if (period === '7d') {
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
  } else if (period === '1y') {
    return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
  } else {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }
}

// Estadísticas del gráfico
const chartStats = computed(() => {
  if (!filteredData.value || filteredData.value.length === 0) return null

  const processedData = processDataByPeriod(filteredData.value)
  const totalPurchases = processedData.reduce((sum, day) => sum + day.purchases, 0)
  const dailyAverage = Math.round(totalPurchases / processedData.length * 10) / 10
  
  const peakDayData = processedData.reduce((peak, current) => 
    current.purchases > peak.purchases ? current : peak, { purchases: 0 }
  )
  
  return {
    totalPurchases,
    dailyAverage,
    peakDay: peakDayData.purchases > 0 ? formatDate(peakDayData.date) : 'N/A'
  }
})

// Actualizar gráfico
const updateChart = async () => {
  loading.value = true
  error.value = null

  try {
    await nextTick()
    
    if (chart.value) {
      chart.value.destroy()
    }

    if (!chartCanvas.value) return

    const ctx = chartCanvas.value.getContext('2d')
    
    chart.value = new Chart(ctx, {
      type: selectedChartType.value === 'area' ? 'line' : selectedChartType.value,
      data: chartData.value,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: selectedEntity.value === 'all' && props.entities.length > 1,
            position: 'top'
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                const value = context.parsed.y
                const label = context.dataset.label
                return `${label}: ${value} compra${value !== 1 ? 's' : ''}`
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
              stepSize: 1,
              callback: function(value) {
                return Math.floor(value)
              }
            }
          }
        }
      }
    })

  } catch (err) {
    console.error('Error updating purchases chart:', err)
    error.value = 'Error al actualizar el gráfico'
  } finally {
    loading.value = false
  }
}

// Watchers
watch([chartData, selectedChartType], updateChart)
watch(selectedEntity, (newValue) => {
  emit('entity-change', newValue)
  updateChart()
})
watch(selectedChartType, (newValue) => {
  emit('chart-type-change', newValue)
})

// Lifecycle
onMounted(() => {
  nextTick(() => {
    updateChart()
  })
})
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
  margin: 1rem 0;
}

.chart-loading,
.chart-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.chart-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.chart-type-selector {
  display: flex;
  flex-wrap: wrap;
}

.chart-stats {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 0.5rem;
  background-color: #f9fafb;
  rounded: 0.375rem;
  border-radius: 0.375rem;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.loading {
  opacity: 0.6;
  pointer-events: none;
}

@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .chart-controls {
    align-items: stretch;
  }
  
  .chart-type-selector {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
}
</style>
