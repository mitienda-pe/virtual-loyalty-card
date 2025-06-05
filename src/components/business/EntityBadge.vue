<template>
  <div class="entity-badge-container">
    <span 
      class="entity-badge" 
      :title="`${entity?.businessName} - ${entity?.ruc}`"
      :class="badgeClass"
    >
      <div class="entity-name">{{ truncatedName }}</div>
      <div class="entity-ruc">{{ entity?.ruc }}</div>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  entity: {
    type: Object,
    default: null
  },
  size: {
    type: String,
    default: 'normal', // normal, small, large
    validator: (value) => ['small', 'normal', 'large'].includes(value)
  },
  variant: {
    type: String,
    default: 'default', // default, primary, secondary
    validator: (value) => ['default', 'primary', 'secondary'].includes(value)
  }
})

const truncatedName = computed(() => {
  if (!props.entity?.businessName) return 'Sin entidad'
  
  const maxLength = props.size === 'small' ? 15 : props.size === 'large' ? 30 : 20
  
  return props.entity.businessName.length > maxLength ? 
    props.entity.businessName.substring(0, maxLength) + '...' : 
    props.entity.businessName
})

const badgeClass = computed(() => {
  const baseClasses = 'inline-flex flex-col rounded transition-colors duration-200'
  
  // Size classes
  const sizeClasses = {
    small: 'px-1.5 py-0.5 text-xs',
    normal: 'px-2 py-1 text-xs',
    large: 'px-3 py-1.5 text-sm'
  }
  
  // Variant classes
  const variantClasses = {
    default: 'bg-gray-100 hover:bg-gray-200',
    primary: 'bg-blue-100 hover:bg-blue-200',
    secondary: 'bg-green-100 hover:bg-green-200'
  }
  
  return `${baseClasses} ${sizeClasses[props.size]} ${variantClasses[props.variant]}`
})
</script>

<style scoped>
.entity-badge {
  cursor: default;
  max-width: 200px;
}

.entity-name {
  @apply font-medium text-gray-900 truncate;
}

.entity-ruc {
  @apply text-gray-600 font-mono text-xs;
}

.entity-badge-container {
  @apply inline-block;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .entity-badge {
    max-width: 150px;
  }
}
</style>
