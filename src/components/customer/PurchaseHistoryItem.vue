<template>
  <div class="purchase-history-item">
    <div class="purchase-main-info">
      <div class="purchase-amount-date">
        <span class="purchase-amount">{{ formatCurrency(purchase.amount) }}</span>
        <span class="purchase-date">{{ formatDate(purchase.date) }}</span>
      </div>
      
      <div v-if="showEntityInfo && purchase.entityId" class="purchase-entity">
        <PurchaseEntityInfo 
          :entity-id="purchase.entityId"
          :entities="businessEntities"
          :max-address-length="40"
        />
      </div>
    </div>
    
    <div class="purchase-details">
      <div class="purchase-badges">
        <span v-if="purchase.invoiceNumber" class="invoice-badge">
          {{ purchase.invoiceNumber }}
        </span>
        <span :class="verifiedBadgeClass">
          {{ purchase.verified ? 'Verificado' : 'Pendiente' }}
        </span>
      </div>
      
      <div v-if="purchase.items?.length" class="purchase-items">
        <details class="items-details">
          <summary class="items-summary">
            {{ purchase.items.length }} {{ purchase.items.length === 1 ? 'producto' : 'productos' }}
          </summary>
          <div class="items-list">
            <div 
              v-for="item in purchase.items.slice(0, 3)" 
              :key="item.description"
              class="item-entry"
            >
              <span class="item-quantity">{{ item.quantity }}x</span>
              <span class="item-description">{{ item.description }}</span>
              <span class="item-price">{{ formatCurrency(item.subtotal || item.unitPrice) }}</span>
            </div>
            <div v-if="purchase.items.length > 3" class="items-more">
              +{{ purchase.items.length - 3 }} más...
            </div>
          </div>
        </details>
      </div>
    </div>

    <!-- Acciones disponibles -->
    <div v-if="showActions" class="purchase-actions">
      <button 
        v-if="purchase.receiptUrl"
        @click="viewReceipt"
        class="action-btn view-receipt"
        title="Ver comprobante"
      >
        <Eye class="w-4 h-4" />
      </button>
      <button 
        v-if="canReport"
        @click="reportIssue"
        class="action-btn report-issue"
        title="Reportar problema"
      >
        <AlertTriangle class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Eye, AlertTriangle } from 'lucide-vue-next'
import PurchaseEntityInfo from './PurchaseEntityInfo.vue'

const props = defineProps({
  purchase: {
    type: Object,
    required: true
  },
  showEntityInfo: {
    type: Boolean,
    default: false
  },
  businessEntities: {
    type: Array,
    default: () => []
  },
  showActions: {
    type: Boolean,
    default: true
  },
  canReport: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['view-receipt', 'report-issue'])

const verifiedBadgeClass = computed(() => {
  return props.purchase.verified 
    ? 'status-badge verified' 
    : 'status-badge pending'
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(amount || 0)
}

const formatDate = (timestamp) => {
  if (!timestamp) return 'Fecha desconocida'
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const viewReceipt = () => {
  emit('view-receipt', props.purchase)
}

const reportIssue = () => {
  emit('report-issue', props.purchase)
}
</script>

<style scoped>
.purchase-history-item {
  @apply bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200;
  @apply flex flex-col sm:flex-row sm:items-start gap-4;
}

.purchase-main-info {
  @apply flex-1;
}

.purchase-amount-date {
  @apply flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2;
}

.purchase-amount {
  @apply text-xl font-bold text-gray-900;
}

.purchase-date {
  @apply text-sm text-gray-600;
}

.purchase-entity {
  @apply mt-2 p-2 bg-gray-50 rounded border-l-4 border-blue-500;
}

.purchase-details {
  @apply flex-shrink-0 space-y-2;
}

.purchase-badges {
  @apply flex flex-wrap gap-2;
}

.invoice-badge {
  @apply inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded;
}

.status-badge {
  @apply inline-flex items-center px-2 py-1 text-xs font-medium rounded;
}

.verified {
  @apply bg-green-100 text-green-800;
}

.pending {
  @apply bg-yellow-100 text-yellow-800;
}

.purchase-items {
  @apply mt-2;
}

.items-details {
  @apply cursor-pointer;
}

.items-summary {
  @apply text-sm text-gray-600 hover:text-gray-800 transition-colors;
}

.items-list {
  @apply mt-2 space-y-1 bg-gray-50 rounded p-2;
}

.item-entry {
  @apply flex justify-between items-center text-sm;
}

.item-quantity {
  @apply font-medium text-gray-700 min-w-8;
}

.item-description {
  @apply flex-1 text-gray-900 mx-2 truncate;
}

.item-price {
  @apply font-medium text-gray-700;
}

.items-more {
  @apply text-xs text-gray-500 italic text-center pt-1;
}

.purchase-actions {
  @apply flex flex-col gap-2;
}

.action-btn {
  @apply inline-flex items-center justify-center p-2 rounded-lg border transition-colors;
}

.view-receipt {
  @apply border-blue-300 text-blue-600 hover:bg-blue-50;
}

.report-issue {
  @apply border-orange-300 text-orange-600 hover:bg-orange-50;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .purchase-history-item {
    @apply p-3;
  }
  
  .purchase-amount-date {
    @apply flex-col items-start;
  }
  
  .purchase-actions {
    @apply flex-row justify-center mt-3;
  }
}
</style>
