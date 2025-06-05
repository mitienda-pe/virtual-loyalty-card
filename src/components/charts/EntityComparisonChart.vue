<template>
  <div class="entity-comparison-chart">
    <div class="chart-header">
      <h3 class="text-lg font-semibold text-gray-900">Comparación entre Entidades</h3>
      <div class="chart-controls">
        <div class="metric-selector">
          <select v-model="selectedMetric" @change="updateChart" class="form-select">
            <option value="revenue">Ingresos</option>
            <option value="purchases">Compras</option>
            <option value="customers">Clientes</option>
            <option value="averageTicket">Ticket Promedio</option>
          </select>
        </div>
        <div class="chart-type-selector">
          <button 
            v-for="type in chartTypes"
            :key="type.value"
            @click="selectedChartType = type.value"
            :class="[
              'px-3 py-1 text-sm rounded-md mr-2',
              selectedChartType === type.value 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            ]"
          >
            {{ type.label }}
          </button>
        </div>
      </div>
    </div>
    
    <div class="chart-container" :class="{ 'loading': loading }">
      <canvas ref="chartCanvas" width="400" height="300"></canvas>
      
      <div v-if="loading" class="chart-loading">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span class="ml-2 text-gray-600">Cargando comparación...</span>
      </div>
      
      <div v-if="error" class="chart-error">
        <p class="text-red-600">Error al cargar la comparación</p>
        <button @click="updateChart" class="text-purple-600 hover:underline">Reintentar</button>
      </div>

      <div v-if="!entities || entities.length === 0" class="chart-empty">
        <p class="text-gray-500">No hay múltiples entidades para comparar</p>
      </div>
    </div>

    <!-- Tabla de comparación -->
    <div v-if="comparisonData.length > 0" class="comparison-table mt-6">
      <h4 class="text-md font-medium text-gray-900 mb-3">Ranking por {{ getMetricLabel(selectedMetric) }}</h4>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ranking
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entidad
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ getMetricLabel(selectedMetric) }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participación
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RUC
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(item, index) in sortedComparisonData" :key="item.entityId">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <span 
                    :class="[
                      'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-50 text-gray-600'
                    ]"
                  >
                    {{ index + 1 }}
                  </span>
                  <span v-if="index === 0" class="ml-2 text-yellow-500">👑</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ item.entityName }}</div>
                <div class="text-sm text-gray-500">{{ item.entityAddress }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ formatMetricValue(item[selectedMetric], selectedMetric) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      class="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${item.percentage}%` }"
                    ></div>
                  </div>
                  <span class="text-sm text-gray-600">{{ item.percentage.toFixed(1) }}%</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ item.entityRuc }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  entities: {
    type: Array,
    default: () => []
  },
  metricsData: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['metric-change', 'chart-type-change'])

// Refs
const chartCanvas = ref(null)
const chart = ref(null)
const loading = ref(false)
const error = ref(null)
const selectedMetric = ref('revenue')
const selectedChartType = ref('bar')

// Tipos de gráfico disponibles
const chartTypes = [
  { label: 'Barras', value: 'bar' },
  { label: 'Dona', value: 'doughnut' },
  { label: 'Radar', value: 'radar' }
]

// Colores para las entidades
const entityColors = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', 
  '#EF4444', '#EC4899', '#6B7280', '#84CC16'
]

// Datos de comparación procesados
const comparisonData = computed(() => {
  if (!props.metricsData || props.metricsData.length === 0) return []

  const total = props.metricsData.reduce((sum, entity) => {
    const value = entity[selectedMetric.value] || 0
    return sum + value
  }, 0)

  return props.metricsData.map((entity, index) => {
    const value = entity[selectedMetric.value] || 0
    const percentage = total > 0 ? (value / total) * 100 : 0

    return {
      entityId: entity.entityId,
      entityName: entity.entityName,
      entityRuc: entity.entityRuc,
      entityAddress: entity.entityAddress,
      [selectedMetric.value]: value,
      percentage,
      color: entityColors[index % entityColors.length]
    }
  })
})

// Datos ordenados para la tabla
const sortedComparisonData = computed(() => {
  return [...comparisonData.value].sort((a, b) => b[selectedMetric.value] - a[selectedMetric.value])
})

// Datos preparados para el gráfico
const chartData = computed(() => {
  if (!comparisonData.value || comparisonData.value.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }

  const labels = comparisonData.value.map(item => item.entityName)
  const data = comparisonData.value.map(item => item[selectedMetric.value])
  const colors = comparisonData.value.map(item => item.color)

  if (selectedChartType.value === 'radar') {
    // Para radar, normalizar los datos
    const maxValue = Math.max(...data)
    const normalizedData = data.map(value => maxValue > 0 ? (value / maxValue) * 100 : 0)

    return {
      labels,
      datasets: [{
        label: getMetricLabel(selectedMetric.value),
        data: normalizedData,
        borderColor: entityColors[0],
        backgroundColor: entityColors[0] + '30',
        borderWidth: 2,
        pointBackgroundColor: entityColors[0],
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    }
  }

  return {
    labels,
    datasets: [{
      label: getMetricLabel(selectedMetric.value),
      data,
      backgroundColor: selectedChartType.value === 'doughnut' ? colors : colors.map(c => c + '80'),
      borderColor: colors,
      borderWidth: selectedChartType.value === 'doughnut' ? 0 : 2
    }]
  }
})

// Obtener etiqueta de métrica
const getMetricLabel = (metric) => {
  const labels = {
    revenue: 'Ingresos',
    purchases: 'Compras',
    customers: 'Clientes',
    averageTicket: 'Ticket Promedio'
  }
  return labels[metric] || metric
}

// Formatear valor de métrica
const formatMetricValue = (value, metric) => {
  if (!value && value !== 0) return 'N/A'

  switch (metric) {
    case 'revenue':
    case 'averageTicket':
      return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
      }).format(value)
    case 'purchases':
    case 'customers':
      return value.toLocaleString('es-PE')
    default:
      return value.toString()
  }
}

// Actualizar gráfico
const updateChart = async () => {
  loading.value = true
  error.value = null

  try {
    await nextTick()
    
    if (chart.value) {
      chart.value.destroy()
    }

    if (!chartCanvas.value || !comparisonData.value.length) {
      loading.value = false
      return
    }

    const ctx = chartCanvas.value.getContext('2d')
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: selectedChartType.value === 'doughnut',
          position: 'right'
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y || context.parsed
              const formatted = formatMetricValue(value, selectedMetric.value)
              
              if (selectedChartType.value === 'doughnut') {
                const percentage = comparisonData.value[context.dataIndex]?.percentage || 0
                return `${context.label}: ${formatted} (${percentage.toFixed(1)}%)`
              }
              
              return `${getMetricLabel(selectedMetric.value)}: ${formatted}`
            }
          }
        }
      }
    }

    // Configuraciones específicas por tipo de gráfico
    if (selectedChartType.value === 'radar') {
      options.scales = {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            callback: function(value) {
              return value + '%'
            }
          }
        }
      }
    } else if (selectedChartType.value === 'bar') {
      options.scales = {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            callback: function(value) {
              return formatMetricValue(value, selectedMetric.value)
            }
          }
        }
      }
    }
    
    chart.value = new Chart(ctx, {
      type: selectedChartType.value,
      data: chartData.value,
      options
    })

  } catch (err) {
    console.error('Error updating comparison chart:', err)
    error.value = 'Error al actualizar el gráfico de comparación'
  } finally {
    loading.value = false
  }
}

// Watchers
watch([chartData, selectedChartType], updateChart)
watch(selectedMetric, (newValue) => {
  emit('metric-change', newValue)
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
  height: 400px;
  margin: 1rem 0;
}

.chart-loading,
.chart-error,
.chart-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  flex-direction: column;
  text-align: center;
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

.metric-selector select {
  @apply px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent;
}

.chart-type-selector {
  display: flex;
  flex-wrap: wrap;
}

.comparison-table {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
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
  
  .comparison-table {
    font-size: 0.875rem;
  }
}
</style>
