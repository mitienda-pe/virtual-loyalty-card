<template>
  <div class="recent-purchases-table">
    <div class="table-header">
      <h3 class="table-title">
        <i class="bi bi-receipt me-2"></i>
        Compras Recientes
      </h3>
      
      <div class="table-filters" v-if="showFilters">
        <div class="filter-group">
          <label class="filter-label">Estado:</label>
          <select v-model="statusFilter" @change="$emit('filter-change', getFilters())" class="filter-select">
            <option value="">Todos</option>
            <option value="verified">Verificados</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>
        
        <div class="filter-group" v-if="showEntityFilter">
          <EntitySelector 
            :entities="entities"
            v-model="entityFilter"
            @change="handleEntityFilterChange"
          />
        </div>
      </div>
      
      <div class="table-actions">
        <button 
          @click="$emit('refresh')" 
          class="btn btn-outline-primary btn-sm"
          :disabled="loading"
        >
          <i class="bi bi-arrow-clockwise me-1"></i>
          Actualizar
        </button>
        
        <button 
          @click="$emit('export')" 
          class="btn btn-outline-secondary btn-sm"
        >
          <i class="bi bi-download me-1"></i>
          Exportar
        </button>
      </div>
    </div>
    
    <!-- Estado de carga -->
    <div v-if="loading" class="loading-state">
      <div class="d-flex justify-content-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando compras...</span>
        </div>
      </div>
    </div>
    
    <!-- Estado vacío -->
    <div v-else-if="purchases.length === 0" class="empty-state">
      <div class="text-center py-5">
        <i class="bi bi-inbox display-1 text-muted"></i>
        <h4 class="text-muted mt-3">No hay compras registradas</h4>
        <p class="text-muted">
          {{ emptyMessage || 'Las compras aparecerán aquí cuando los clientes envíen sus comprobantes.' }}
        </p>
        <button 
          v-if="showAddPurchase"
          @click="$emit('add-purchase')" 
          class="btn btn-primary"
        >
          <i class="bi bi-plus-circle me-2"></i>
          Registrar Primera Compra
        </button>
      </div>
    </div>
    
    <!-- Tabla de compras -->
    <div v-else class="table-responsive">
      <table class="table table-hover">
        <thead class="table-dark">
          <tr>
            <th scope="col">
              <button class="btn-sort" @click="sort('date')">
                Fecha
                <i :class="getSortIcon('date')"></i>
              </button>
            </th>
            <th scope="col">
              <button class="btn-sort" @click="sort('customerName')">
                Cliente
                <i :class="getSortIcon('customerName')"></i>
              </button>
            </th>
            <th v-if="showEntityColumn" scope="col">Entidad</th>
            <th scope="col">
              <button class="btn-sort" @click="sort('amount')">
                Monto
                <i :class="getSortIcon('amount')"></i>
              </button>
            </th>
            <th scope="col">Comprobante</th>
            <th scope="col">Estado</th>
            <th scope="col" v-if="showActions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="purchase in sortedPurchases" :key="purchase.id" :class="getRowClass(purchase)">
            <!-- Fecha -->
            <td>
              <div class="date-cell">
                <div class="date-primary">{{ formatDate(purchase.date) }}</div>
                <small class="date-secondary text-muted">{{ formatTime(purchase.date) }}</small>
              </div>
            </td>
            
            <!-- Cliente -->
            <td>
              <div class="customer-cell">
                <div class="customer-name">{{ purchase.customerName || 'Cliente' }}</div>
                <small class="customer-phone text-muted">{{ formatPhone(purchase.phoneNumber) }}</small>
              </div>
            </td>
            
            <!-- Entidad (si se muestra) -->
            <td v-if="showEntityColumn">
              <EntityBadge 
                :entity="getEntityInfo(purchase.entityId)" 
                size="small"
                :variant="purchase.verified ? 'primary' : 'default'"
              />
            </td>
            
            <!-- Monto -->
            <td>
              <div class="amount-cell">
                <span class="amount-value" :class="getAmountClass(purchase)">
                  {{ formatCurrency(purchase.amount) }}
                </span>
                <div v-if="purchase.manualEntry" class="manual-indicator">
                  <i class="bi bi-pencil text-warning" title="Registro manual"></i>
                </div>
              </div>
            </td>
            
            <!-- Comprobante -->
            <td>
              <div class="invoice-cell">
                <code class="invoice-number">{{ purchase.invoiceNumber || 'N/A' }}</code>
                <div v-if="purchase.ruc" class="ruc-info">
                  <small class="text-muted">{{ purchase.ruc }}</small>
                </div>
              </div>
            </td>
            
            <!-- Estado -->
            <td>
              <div class="status-cell">
                <span :class="getStatusBadgeClass(purchase)">
                  <i :class="getStatusIcon(purchase)" class="me-1"></i>
                  {{ getStatusText(purchase) }}
                </span>
                
                <!-- Indicadores adicionales -->
                <div class="status-indicators mt-1">
                  <span 
                    v-if="purchase.usedForRedemption" 
                    class="badge bg-purple text-white" 
                    title="Usado para canjear premio"
                  >
                    <i class="bi bi-gift"></i>
                  </span>
                  
                  <span 
                    v-if="purchase.receiptUrl" 
                    class="badge bg-info text-white" 
                    title="Tiene imagen de comprobante"
                  >
                    <i class="bi bi-image"></i>
                  </span>
                </div>
              </div>
            </td>
            
            <!-- Acciones -->
            <td v-if="showActions">
              <div class="action-buttons">
                <div class="btn-group" role="group">
                  <button 
                    v-if="purchase.receiptUrl"
                    @click="$emit('view-receipt', purchase)"
                    class="btn btn-sm btn-outline-primary"
                    title="Ver comprobante"
                  >
                    <i class="bi bi-image"></i>
                  </button>
                  
                  <button 
                    @click="$emit('view-details', purchase)"
                    class="btn btn-sm btn-outline-secondary"
                    title="Ver detalles"
                  >
                    <i class="bi bi-eye"></i>
                  </button>
                  
                  <button 
                    v-if="!purchase.verified && canVerify"
                    @click="$emit('verify-purchase', purchase)"
                    class="btn btn-sm btn-outline-success"
                    title="Verificar compra"
                  >
                    <i class="bi bi-check-circle"></i>
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Paginación -->
    <div v-if="showPagination && totalPages > 1" class="table-pagination">
      <nav aria-label="Paginación de compras">
        <ul class="pagination pagination-sm justify-content-center">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button class="page-link" @click="$emit('page-change', currentPage - 1)" :disabled="currentPage === 1">
              <i class="bi bi-chevron-left"></i>
            </button>
          </li>
          
          <li 
            v-for="page in visiblePages" 
            :key="page"
            class="page-item" 
            :class="{ active: page === currentPage }"
          >
            <button class="page-link" @click="$emit('page-change', page)">
              {{ page }}
            </button>
          </li>
          
          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <button class="page-link" @click="$emit('page-change', currentPage + 1)" :disabled="currentPage === totalPages">
              <i class="bi bi-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
      
      <div class="pagination-info text-center text-muted">
        Mostrando {{ purchases.length }} de {{ totalItems }} compras
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import EntityBadge from './EntityBadge.vue'
import EntitySelector from './EntitySelector.vue'

const props = defineProps({
  purchases: {
    type: Array,
    default: () => []
  },
  entities: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  showEntityColumn: {
    type: Boolean,
    default: false
  },
  showActions: {
    type: Boolean,
    default: true
  },
  showFilters: {
    type: Boolean,
    default: true
  },
  showEntityFilter: {
    type: Boolean,
    default: true
  },
  showAddPurchase: {
    type: Boolean,
    default: true
  },
  showPagination: {
    type: Boolean,
    default: false
  },
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  },
  totalItems: {
    type: Number,
    default: 0
  },
  canVerify: {
    type: Boolean,
    default: true
  },
  emptyMessage: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'filter-change',
  'sort-change', 
  'refresh', 
  'export', 
  'add-purchase',
  'view-receipt', 
  'view-details', 
  'verify-purchase',
  'page-change'
])

// Estados locales para filtros y ordenamiento
const statusFilter = ref('')
const entityFilter = ref('all')
const sortField = ref('date')
const sortDirection = ref('desc')

// Computados
const sortedPurchases = computed(() => {
  let filtered = [...props.purchases]
  
  // Aplicar filtro de estado
  if (statusFilter.value) {
    if (statusFilter.value === 'verified') {
      filtered = filtered.filter(p => p.verified)
    } else if (statusFilter.value === 'pending') {
      filtered = filtered.filter(p => !p.verified)
    }
  }
  
  // Ordenar
  filtered.sort((a, b) => {
    let aVal = a[sortField.value]
    let bVal = b[sortField.value]
    
    // Manejo especial para fechas
    if (sortField.value === 'date') {
      aVal = new Date(aVal?.toDate ? aVal.toDate() : aVal)
      bVal = new Date(bVal?.toDate ? bVal.toDate() : bVal)
    }
    
    // Manejo especial para números
    if (sortField.value === 'amount') {
      aVal = parseFloat(aVal) || 0
      bVal = parseFloat(bVal) || 0
    }
    
    if (sortDirection.value === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })
  
  return filtered
})

const visiblePages = computed(() => {
  const delta = 2
  const range = []
  const rangeWithDots = []
  
  for (let i = Math.max(2, props.currentPage - delta); 
       i <= Math.min(props.totalPages - 1, props.currentPage + delta); 
       i++) {
    range.push(i)
  }
  
  if (props.currentPage - delta > 2) {
    rangeWithDots.push(1, '...')
  } else {
    rangeWithDots.push(1)
  }
  
  rangeWithDots.push(...range)
  
  if (props.currentPage + delta < props.totalPages - 1) {
    rangeWithDots.push('...', props.totalPages)
  } else if (props.totalPages > 1) {
    rangeWithDots.push(props.totalPages)
  }
  
  return rangeWithDots.filter((page, index, arr) => arr.indexOf(page) === index)
})

// Métodos
const getFilters = () => ({
  status: statusFilter.value,
  entity: entityFilter.value
})

const handleEntityFilterChange = (data) => {
  entityFilter.value = data.entityId
  emit('filter-change', getFilters())
}

const sort = (field) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
  
  emit('sort-change', {
    field: sortField.value,
    direction: sortDirection.value
  })
}

const getSortIcon = (field) => {
  if (sortField.value !== field) return 'bi bi-arrow-down-up'
  return sortDirection.value === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down'
}

const getEntityInfo = (entityId) => {
  if (!props.entities || !entityId) return null
  return props.entities.find(entity => entity.id === entityId)
}

const getRowClass = (purchase) => {
  const classes = []
  if (!purchase.verified) classes.push('table-warning')
  if (purchase.usedForRedemption) classes.push('table-secondary')
  return classes.join(' ')
}

const getAmountClass = (purchase) => {
  return purchase.verified ? 'text-success fw-bold' : 'text-muted'
}

const getStatusBadgeClass = (purchase) => {
  const baseClass = 'badge'
  if (purchase.verified) {
    return `${baseClass} bg-success`
  } else {
    return `${baseClass} bg-warning text-dark`
  }
}

const getStatusIcon = (purchase) => {
  return purchase.verified ? 'bi bi-check-circle-fill' : 'bi bi-clock-fill'
}

const getStatusText = (purchase) => {
  return purchase.verified ? 'Verificado' : 'Pendiente'
}

// Utilidades de formateo
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(value || 0)
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  
  const dateObj = date.toDate ? date.toDate() : new Date(date)
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj)
}

const formatTime = (date) => {
  if (!date) return ''
  
  const dateObj = date.toDate ? date.toDate() : new Date(date)
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

const formatPhone = (phone) => {
  if (!phone) return 'N/A'
  return phone.replace(/(\+51)(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')
}

// Watchers para emitir cambios
watch([statusFilter, entityFilter], () => {
  emit('filter-change', getFilters())
})
</script>

<style scoped>
.recent-purchases-table {
  @apply bg-white rounded-lg shadow-sm border border-gray-200;
}

.table-header {
  @apply flex flex-wrap items-center justify-between p-4 border-b border-gray-200 gap-4;
}

.table-title {
  @apply text-lg font-semibold text-gray-900 mb-0;
}

.table-filters {
  @apply flex flex-wrap items-center gap-3;
}

.filter-group {
  @apply flex items-center gap-2;
}

.filter-label {
  @apply text-sm font-medium text-gray-700 mb-0;
}

.filter-select {
  @apply form-select form-select-sm border-gray-300;
}

.table-actions {
  @apply flex gap-2;
}

/* Estados especiales */
.loading-state,
.empty-state {
  @apply p-4;
}

/* Tabla */
.table {
  @apply mb-0;
}

.table th {
  @apply bg-gray-800 text-white border-0;
}

.btn-sort {
  @apply bg-transparent border-0 text-white p-0 d-flex align-items-center gap-1;
}

.btn-sort:hover {
  @apply text-gray-200;
}

/* Celdas especiales */
.date-cell .date-primary {
  @apply font-medium;
}

.customer-cell .customer-name {
  @apply font-medium;
}

.amount-cell {
  @apply d-flex align-items-center gap-1;
}

.invoice-cell .invoice-number {
  @apply bg-gray-100 px-2 py-1 rounded text-xs;
}

.status-cell .status-indicators {
  @apply d-flex gap-1;
}

.action-buttons .btn-group {
  @apply shadow-sm;
}

/* Paginación */
.table-pagination {
  @apply p-4 border-t border-gray-200;
}

.pagination-info {
  @apply mt-2 text-sm;
}

/* Responsive */
@media (max-width: 768px) {
  .table-header {
    @apply flex-col items-start;
  }
  
  .table-filters {
    @apply w-full justify-between;
  }
  
  .table-actions {
    @apply w-full justify-end;
  }
  
  .table-responsive {
    @apply text-sm;
  }
  
  .action-buttons .btn-group .btn {
    @apply px-2;
  }
}

/* Estados de fila */
.table-warning {
  @apply bg-amber-50;
}

.table-secondary {
  @apply bg-gray-50;
}

/* Badge personalizado para purple */
.bg-purple {
  background-color: #8b5cf6 !important;
}
</style>
