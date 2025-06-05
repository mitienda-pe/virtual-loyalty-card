<template>
  <div :class="cardClasses">
    <div class="stat-icon">
      <component :is="iconComponent" class="w-6 h-6" />
    </div>
    <div class="stat-content">
      <div class="stat-value">{{ value }}</div>
      <div class="stat-title">{{ title }}</div>
      <div v-if="subtitle" class="stat-subtitle">{{ subtitle }}</div>
    </div>
    <div v-if="trend" class="stat-trend">
      <TrendingUp v-if="trend > 0" class="w-4 h-4 text-green-500" />
      <TrendingDown v-else-if="trend < 0" class="w-4 h-4 text-red-500" />
      <Minus v-else class="w-4 h-4 text-gray-400" />
      <span :class="trendTextClass">{{ formatTrend(trend) }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { 
  Building,
  ShoppingCart,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Calendar,
  Target,
  CreditCard,
  Star
} from 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: 'blue',
    validator: (value) => ['blue', 'green', 'purple', 'orange', 'red', 'gray'].includes(value)
  },
  subtitle: {
    type: String,
    default: null
  },
  trend: {
    type: Number,
    default: null
  }
})

// Mapeo de iconos
const iconMap = {
  'building': Building,
  'shopping-cart': ShoppingCart,
  'dollar-sign': DollarSign,
  'users': Users,
  'bar-chart': BarChart3,
  'calendar': Calendar,
  'target': Target,
  'credit-card': CreditCard,
  'star': Star
}

const iconComponent = computed(() => {
  return iconMap[props.icon] || Building
})

const cardClasses = computed(() => {
  const baseClasses = 'stat-card'
  const colorClasses = {
    blue: 'stat-card-blue',
    green: 'stat-card-green',
    purple: 'stat-card-purple',
    orange: 'stat-card-orange',
    red: 'stat-card-red',
    gray: 'stat-card-gray'
  }
  
  return [baseClasses, colorClasses[props.color]]
})

const trendTextClass = computed(() => {
  if (props.trend > 0) return 'text-green-600 font-medium'
  if (props.trend < 0) return 'text-red-600 font-medium'
  return 'text-gray-500'
})

const formatTrend = (trend) => {
  if (trend === null || trend === undefined) return ''
  const sign = trend > 0 ? '+' : ''
  return `${sign}${trend.toFixed(1)}%`
}
</script>

<style scoped>
.stat-card {
  @apply bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200;
  @apply flex items-start gap-4;
}

.stat-icon {
  @apply flex-shrink-0 p-3 rounded-lg;
}

.stat-card-blue .stat-icon {
  @apply bg-blue-100 text-blue-600;
}

.stat-card-green .stat-icon {
  @apply bg-green-100 text-green-600;
}

.stat-card-purple .stat-icon {
  @apply bg-purple-100 text-purple-600;
}

.stat-card-orange .stat-icon {
  @apply bg-orange-100 text-orange-600;
}

.stat-card-red .stat-icon {
  @apply bg-red-100 text-red-600;
}

.stat-card-gray .stat-icon {
  @apply bg-gray-100 text-gray-600;
}

.stat-content {
  @apply flex-1 min-w-0;
}

.stat-value {
  @apply text-2xl font-bold text-gray-900 leading-tight;
}

.stat-title {
  @apply text-sm font-medium text-gray-600 mt-1;
}

.stat-subtitle {
  @apply text-xs text-gray-500 mt-1;
}

.stat-trend {
  @apply flex items-center gap-1 mt-2 text-xs;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .stat-card {
    @apply flex-col text-center gap-3;
  }
  
  .stat-value {
    @apply text-xl;
  }
}
</style>
