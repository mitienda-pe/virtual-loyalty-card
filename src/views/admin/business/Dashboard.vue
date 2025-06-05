<template>
  <div class="business-admin-dashboard">
    <!-- Header con selector de entidad -->
    <div class="dashboard-header mb-4">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h1 class="h3 mb-0">Dashboard - {{ business?.name || 'Cargando...' }}</h1>
          <p class="text-muted mb-0">Panel de control del negocio</p>
        </div>
        
        <!-- Selector de entidad -->
        <div v-if="business?.businessEntities?.length > 1" class="entity-selector-wrapper">
          <EntitySelector 
            :entities="business.businessEntities"
            v-model="selectedEntityId"
            @change="handleEntityChange"
          />
        </div>
      </div>
      
      <!-- Información de la entidad seleccionada -->
      <div v-if="selectedEntity && selectedEntityId !== 'all'" class="selected-entity-info mt-3">
        <div class="alert alert-info mb-0">
          <strong>Vista filtrada:</strong> Mostrando datos únicamente de 
          <em>{{ selectedEntity.businessName }}</em> ({{ selectedEntity.ruc }})
        </div>
      </div>
    </div>

    <!-- Métricas principales -->
    <div class="row mb-4">
      <div class="col-md-3 mb-3">
        <div class="card bg-primary text-white h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="card-title">Total de Clientes</h6>
                <h3 class="mb-0">{{ formatNumber(metrics.uniqueCustomers) }}</h3>
              </div>
              <i class="bi bi-people fs-2"></i>
            </div>
            <p class="card-text mt-2 mb-0">
              <small>
                <i class="bi bi-arrow-up"></i> 
                {{ entitySubtitle }}
              </small>
            </p>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 mb-3">
        <div class="card bg-success text-white h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="card-title">Compras Totales</h6>
                <h3 class="mb-0">{{ formatNumber(metrics.totalPurchases) }}</h3>
              </div>
              <i class="bi bi-bag-check fs-2"></i>
            </div>
            <p class="card-text mt-2 mb-0">
              <small>
                <span :class="growthClass">
                  <i :class="growthIcon"></i> {{ formatGrowth(metrics.monthlyGrowth) }}%
                </span>
                vs mes anterior
              </small>
            </p>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 mb-3">
        <div class="card bg-info text-white h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="card-title">Ingresos</h6>
                <h3 class="mb-0">{{ formatCurrency(metrics.totalRevenue) }}</h3>
              </div>
              <i class="bi bi-cash-stack fs-2"></i>
            </div>
            <p class="card-text mt-2 mb-0">
              <small>
                {{ formatCurrency(metrics.averageTicket) }} ticket promedio
              </small>
            </p>
          </div>
        </div>
      </div>

      <div class="col-md-3 mb-3">
        <div class="card bg-warning text-white h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="card-title">Entidades Activas</h6>
                <h3 class="mb-0">{{ business?.businessEntities?.length || 1 }}</h3>
              </div>
              <i class="bi bi-building fs-2"></i>
            </div>
            <p class="card-text mt-2 mb-0">
              <small>
                {{ business?.businessEntities?.length > 1 ? 'Múltiples entidades' : 'Entidad única' }}
              </small>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Desglose por entidades (solo si hay múltiples y vista consolidada) -->
    <div v-if="showEntityBreakdown" class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h5 class="card-title mb-0">
              <i class="bi bi-building me-2"></i>
              Desglose por Entidades Comerciales
            </h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div 
                v-for="entity in business.businessEntities" 
                :key="entity.id"
                class="col-lg-6 col-xl-4 mb-3"
              >
                <EntityStatsCard 
                  :entity="entity"
                  :stats="getEntityStats(entity.id)"
                  @view-details="filterByEntity"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Gráficos y actividad -->
    <div class="row">
      <div class="col-md-8 mb-4">
        <div class="card">
          <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Compras Recientes</h5>
            <small class="badge bg-light text-primary">
              {{ selectedEntityId === 'all' ? 'Todas las entidades' : 'Entidad filtrada' }}
            </small>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            
            <div v-else-if="recentPurchases.length === 0" class="text-center py-4">
              <i class="bi bi-inbox display-1 text-muted"></i>
              <p class="text-muted mt-3">No hay compras recientes.</p>
              <button @click="refreshData" class="btn btn-outline-primary">
                <i class="bi bi-arrow-clockwise me-1"></i>
                Actualizar
              </button>
            </div>
            
            <div v-else class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th v-if="showEntityColumn">Entidad</th>
                    <th>Monto</th>
                    <th>Comprobante</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="purchase in recentPurchases" :key="purchase.id">
                    <td>{{ formatDate(purchase.date) }}</td>
                    <td>
                      <div>
                        <strong>{{ purchase.customerName || 'Cliente' }}</strong>
                        <br>
                        <small class="text-muted">{{ formatPhone(purchase.phoneNumber) }}</small>
                      </div>
                    </td>
                    <td v-if="showEntityColumn">
                      <EntityBadge 
                        :entity="getEntityById(purchase.entityId)" 
                        size="small"
                      />
                    </td>
                    <td>
                      <strong>{{ formatCurrency(purchase.amount) }}</strong>
                    </td>
                    <td>
                      <small class="font-monospace">{{ purchase.invoiceNumber || 'N/A' }}</small>
                    </td>
                    <td>
                      <span :class="`badge ${purchase.verified ? 'bg-success' : 'bg-warning'}`">
                        {{ purchase.verified ? 'Verificado' : 'Pendiente' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="mt-3 text-end">
              <router-link 
                :to="{ name: 'business-purchases', query: selectedEntityId !== 'all' ? { entity: selectedEntityId } : {} }" 
                class="btn btn-primary"
              >
                <i class="bi bi-list-ul me-1"></i>
                Ver todas las compras
              </router-link>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-4">
        <!-- Top Clientes -->
        <div class="card mb-4">
          <div class="card-header bg-success text-white">
            <h5 class="card-title mb-0">
              <i class="bi bi-star me-2"></i>
              Top Clientes
            </h5>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-center py-4">
              <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            
            <div v-else-if="metrics.topCustomers?.length === 0" class="text-center py-4">
              <p class="text-muted">No hay datos de clientes disponibles.</p>
            </div>
            
            <div v-else>
              <div v-for="(customer, index) in metrics.topCustomers?.slice(0, 5)" :key="customer.phoneNumber" class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex align-items-center">
                  <div class="rank-badge me-3">
                    <span class="badge bg-primary">{{ index + 1 }}</span>
                  </div>
                  <div>
                    <div class="fw-semibold">{{ customer.customerName }}</div>
                    <small class="text-muted">{{ formatPhone(customer.phoneNumber) }}</small>
                  </div>
                </div>
                <div class="text-end">
                  <div class="fw-bold text-success">{{ formatCurrency(customer.totalSpent) }}</div>
                  <small class="text-muted">{{ customer.purchaseCount }} compras</small>
                </div>
              </div>
              
              <div class="mt-3 text-end">
                <router-link to="/admin/business/customers" class="btn btn-success btn-sm">
                  <i class="bi bi-people me-1"></i>
                  Ver todos los clientes
                </router-link>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Acciones Rápidas -->
        <div class="card">
          <div class="card-header bg-info text-white">
            <h5 class="card-title mb-0">
              <i class="bi bi-lightning me-2"></i>
              Acciones Rápidas
            </h5>
          </div>
          <div class="card-body">
            <div class="d-grid gap-2">
              <button class="btn btn-primary" @click="showRegisterPurchaseModal">
                <i class="bi bi-receipt me-2"></i> 
                Registrar Compra Manual
              </button>
              
              <router-link 
                to="/admin/business/settings" 
                class="btn btn-outline-secondary"
              >
                <i class="bi bi-gear me-2"></i>
                Configurar Negocio
              </router-link>
              
              <button 
                v-if="business?.businessEntities?.length <= 1"
                class="btn btn-outline-info" 
                @click="showAddEntityModal"
              >
                <i class="bi bi-building-add me-2"></i>
                Agregar Entidad
              </button>
              
              <button class="btn btn-outline-warning" @click="exportData">
                <i class="bi bi-download me-2"></i>
                Exportar Datos
              </button>
            </div>
            
            <!-- Mini estadísticas -->
            <div class="mt-4 pt-3 border-top">
              <h6 class="text-muted">Última actualización</h6>
              <small class="text-muted">
                {{ lastUpdated ? formatDate(lastUpdated) : 'Nunca' }}
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para registrar compra manual -->
    <div class="modal fade" id="registerPurchaseModal" tabindex="-1" aria-labelledby="registerPurchaseModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="registerPurchaseModalLabel">
              <i class="bi bi-receipt me-2"></i>
              Registrar Compra Manual
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="registerManualPurchase">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="customerPhone" class="form-label">Teléfono del Cliente</label>
                  <input 
                    type="tel" 
                    class="form-control" 
                    id="customerPhone" 
                    v-model="newPurchase.phoneNumber" 
                    placeholder="+51987654321"
                    required
                  >
                </div>
                <div class="col-md-6 mb-3">
                  <label for="customerName" class="form-label">Nombre del Cliente</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    id="customerName" 
                    v-model="newPurchase.customerName"
                    placeholder="Nombre opcional"
                  >
                </div>
              </div>
              
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="purchaseAmount" class="form-label">Monto de la Compra</label>
                  <div class="input-group">
                    <span class="input-group-text">S/</span>
                    <input 
                      type="number" 
                      class="form-control" 
                      id="purchaseAmount" 
                      v-model.number="newPurchase.amount" 
                      min="0" 
                      step="0.01" 
                      required
                    >
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <label for="entitySelect" class="form-label">Entidad Comercial</label>
                  <select class="form-select" id="entitySelect" v-model="newPurchase.entityId" required>
                    <option value="" disabled>Seleccionar entidad</option>
                    <option 
                      v-for="entity in business?.businessEntities || []" 
                      :key="entity.id"
                      :value="entity.id"
                    >
                      {{ entity.businessName }} ({{ entity.ruc }})
                    </option>
                  </select>
                </div>
              </div>
              
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="invoiceNumber" class="form-label">Número de Comprobante</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    id="invoiceNumber" 
                    v-model="newPurchase.invoiceNumber"
                    placeholder="F001-123456 o B001-123456"
                    required
                  >
                </div>
                <div class="col-md-6 mb-3">
                  <label for="purchaseDate" class="form-label">Fecha de Compra</label>
                  <input 
                    type="date" 
                    class="form-control" 
                    id="purchaseDate" 
                    v-model="newPurchase.date"
                    :max="today"
                    required
                  >
                </div>
              </div>
              
              <div class="mb-3">
                <label for="purchaseDescription" class="form-label">Descripción (opcional)</label>
                <textarea 
                  class="form-control" 
                  id="purchaseDescription" 
                  v-model="newPurchase.description"
                  rows="2"
                  placeholder="Descripción opcional de la compra..."
                ></textarea>
              </div>
              
              <div class="d-grid">
                <button type="submit" class="btn btn-primary" :disabled="registeringPurchase">
                  <span v-if="registeringPurchase" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  <i v-else class="bi bi-check-circle me-2"></i>
                  Registrar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBusinessMetrics } from '@/composables/useBusinessMetrics'
import { businessService } from '@/services/businessService'
import EntitySelector from '@/components/business/EntitySelector.vue'
import EntityBadge from '@/components/business/EntityBadge.vue'
import EntityStatsCard from '@/components/business/EntityStatsCard.vue'

const authStore = useAuthStore()

// Estados principales
const loading = ref(true)
const selectedEntityId = ref('all')
const recentPurchases = ref([])
const business = ref(null)

// Modal states
const registeringPurchase = ref(false)
const newPurchase = ref({
  phoneNumber: '',
  customerName: '',
  amount: 0,
  entityId: '',
  invoiceNumber: '',
  date: '',
  description: ''
})

// Usar el composable de métricas
const { metrics, loading: metricsLoading, lastUpdated, fetchMetrics, refresh } = useBusinessMetrics(
  computed(() => authStore.businessId),
  selectedEntityId
)

// Computados
const selectedEntity = computed(() => {
  if (!business.value?.businessEntities || selectedEntityId.value === 'all') return null
  return business.value.businessEntities.find(entity => entity.id === selectedEntityId.value)
})

const entitySubtitle = computed(() => {
  return selectedEntityId.value === 'all' ? 'Todas las entidades' : 'Entidad filtrada'
})

const showEntityBreakdown = computed(() => {
  return business.value?.businessEntities?.length > 1 && selectedEntityId.value === 'all'
})

const showEntityColumn = computed(() => {
  return business.value?.businessEntities?.length > 1 && selectedEntityId.value === 'all'
})

const growthClass = computed(() => {
  const growth = metrics.value.monthlyGrowth || 0
  return growth >= 0 ? 'text-success' : 'text-danger'
})

const growthIcon = computed(() => {
  const growth = metrics.value.monthlyGrowth || 0
  return growth >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'
})

const today = computed(() => {
  return new Date().toISOString().split('T')[0]
})

// Métodos principales
const loadBusinessData = async () => {
  try {
    if (!authStore.businessId) return
    
    business.value = await businessService.getBusinessById(authStore.businessId)
    
    // Si no hay entidades, crear una por defecto
    if (!business.value.businessEntities || business.value.businessEntities.length === 0) {
      business.value.businessEntities = [{
        id: 'default',
        businessName: business.value.businessName || business.value.name,
        ruc: business.value.ruc,
        address: business.value.address || '',
        locations: []
      }]
    }
  } catch (error) {
    console.error('Error loading business data:', error)
  }
}

const loadRecentPurchases = async () => {
  try {
    if (!authStore.businessId) return
    
    const filters = { limit: 10 }
    if (selectedEntityId.value && selectedEntityId.value !== 'all') {
      filters.entityId = selectedEntityId.value
    }
    
    recentPurchases.value = await businessService.getPurchases(authStore.businessId, filters)
  } catch (error) {
    console.error('Error loading recent purchases:', error)
  }
}

const handleEntityChange = async (data) => {
  selectedEntityId.value = data.entityId
  await loadRecentPurchases()
}

const filterByEntity = (entity) => {
  selectedEntityId.value = entity.id
}

const getEntityStats = (entityId) => {
  const entityBreakdown = metrics.value.entityBreakdown || []
  const entityMetrics = entityBreakdown.find(item => item.entityId === entityId)
  return entityMetrics?.metrics || {
    purchases: 0,
    revenue: 0,
    customers: 0,
    averageTicket: 0
  }
}

const getEntityById = (entityId) => {
  if (!business.value?.businessEntities) return null
  return business.value.businessEntities.find(entity => entity.id === entityId)
}

const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadBusinessData(),
      loadRecentPurchases(),
      refresh()
    ])
  } finally {
    loading.value = false
  }
}

const showRegisterPurchaseModal = () => {
  // Reset form
  newPurchase.value = {
    phoneNumber: '',
    customerName: '',
    amount: 0,
    entityId: business.value?.businessEntities?.[0]?.id || '',
    invoiceNumber: '',
    date: today.value,
    description: ''
  }
  
  const modal = new bootstrap.Modal(document.getElementById('registerPurchaseModal'))
  modal.show()
}

const registerManualPurchase = async () => {
  registeringPurchase.value = true
  
  try {
    const selectedEntityData = getEntityById(newPurchase.value.entityId)
    
    const purchaseData = {
      ...newPurchase.value,
      businessSlug: authStore.businessId,
      ruc: selectedEntityData?.ruc,
      businessName: selectedEntityData?.businessName,
      address: selectedEntityData?.address,
      verified: true,
      manualEntry: true,
      enteredBy: authStore.user.uid
    }
    
    await businessService.registerPurchase(purchaseData)
    
    // Refresh data
    await refreshData()
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('registerPurchaseModal'))
    modal.hide()
    
    // Show success message
    alert('Compra registrada exitosamente')
    
  } catch (error) {
    console.error('Error registering purchase:', error)
    alert('Error al registrar la compra: ' + error.message)
  } finally {
    registeringPurchase.value = false
  }
}

const showAddEntityModal = () => {
  // TODO: Implementar modal para agregar nueva entidad
  alert('Funcionalidad de agregar entidad en desarrollo')
}

const exportData = () => {
  // TODO: Implementar exportación de datos
  alert('Funcionalidad de exportación en desarrollo')
}

// Utilidades de formateo
const formatNumber = (value) => {
  return new Intl.NumberFormat('es-PE').format(value || 0)
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(value || 0)
}

const formatGrowth = (value) => {
  return Math.abs(value || 0).toFixed(1)
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  
  const dateObj = date.toDate ? date.toDate() : new Date(date)
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

const formatPhone = (phone) => {
  if (!phone) return 'N/A'
  return phone.replace(/(\+51)(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')
}

// Watchers
watch(selectedEntityId, () => {
  loadRecentPurchases()
})

// Lifecycle
onMounted(async () => {
  if (authStore.isAuthenticated && (authStore.isBusinessAdmin || authStore.isSuperAdmin)) {
    await refreshData()
  }
  loading.value = false
})
</script>

<style scoped>
.business-admin-dashboard {
  padding-bottom: 2rem;
}

.dashboard-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 0.75rem;
  margin-bottom: 2rem;
}

.entity-selector-wrapper {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 0.5rem;
  backdrop-filter: blur(10px);
}

.selected-entity-info {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
}

.rank-badge {
  width: 40px;
  text-align: center;
}

.card {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  border: none;
}

.card:hover {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.15s ease-in-out;
}

@media (max-width: 768px) {
  .dashboard-header {
    padding: 1rem;
  }
  
  .dashboard-header .d-flex {
    flex-direction: column;
    gap: 1rem;
  }
  
  .entity-selector-wrapper {
    width: 100%;
  }
}
</style>
