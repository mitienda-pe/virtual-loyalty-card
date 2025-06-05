<template>
  <div class="purchase-entity-info">
    <div v-if="entityInfo" class="entity-details">
      <div class="entity-name">{{ entityInfo.businessName }}</div>
      <div class="entity-address">
        <MapPin class="w-3 h-3" />
        <span>{{ truncateAddress(entityInfo.address) }}</span>
      </div>
      <div v-if="showRuc" class="entity-ruc">
        RUC: {{ entityInfo.ruc }}
      </div>
    </div>
    <div v-else class="entity-unknown">
      <span class="text-muted">Ubicación no especificada</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MapPin } from 'lucide-vue-next'

const props = defineProps({
  entityId: {
    type: String,
    default: null
  },
  entities: {
    type: Array,
    default: () => []
  },
  showRuc: {
    type: Boolean,
    default: false
  },
  maxAddressLength: {
    type: Number,
    default: 30
  }
})

const entityInfo = computed(() => {
  if (!props.entityId || !props.entities?.length) return null
  return props.entities.find(entity => entity.id === props.entityId)
})

const truncateAddress = (address) => {
  if (!address) return 'Dirección no disponible'
  if (address.length <= props.maxAddressLength) return address
  return address.substring(0, props.maxAddressLength) + '...'
}
</script>

<style scoped>
.purchase-entity-info {
  @apply text-sm;
}

.entity-details {
  @apply space-y-1;
}

.entity-name {
  @apply font-medium text-gray-900;
}

.entity-address {
  @apply flex items-center gap-1 text-gray-600;
}

.entity-ruc {
  @apply text-xs text-gray-500 font-mono;
}

.entity-unknown {
  @apply text-gray-400 italic;
}
</style>
