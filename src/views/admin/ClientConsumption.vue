<!-- src/views/admin/ClientConsumption.vue -->
<template>
  <div class="container-fluid">

    <!-- Filtros -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label for="searchInput" class="form-label">Buscar Cliente</label>
                <div class="input-group">
                  <span class="input-group-text"><Search size="18" /></span>
                  <input 
                    type="text" 
                    class="form-control" 
                    id="searchInput" 
                    v-model="searchTerm" 
                    placeholder="Buscar por nombre o teléfono"
                  >
                </div>
              </div>
              <div class="col-md-3" v-if="authStore.isSuperAdmin">
                <label for="businessFilter" class="form-label">Negocio</label>
                <select class="form-select" id="businessFilter" v-model="businessFilter">
                  <option value="">Todos los negocios</option>
                  <option v-for="business in businesses" :key="business.id" :value="business.id">
                    {{ business.name }}
                  </option>
                </select>
              </div>
              <div class="col-md-3">
                <label for="dateRangeFilter" class="form-label">Rango de Fechas</label>
                <select class="form-select" id="dateRangeFilter" v-model="dateRangeFilter">
                  <option value="all">Todo el tiempo</option>
                  <option value="today">Hoy</option>
                  <option value="week">Esta semana</option>
                  <option value="month">Este mes</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
              <div class="col-md-2 d-flex align-items-end">
                <button class="btn btn-outline-secondary w-100" @click="resetFilters">
                  <XCircle class="me-1" size="18" /> Limpiar
                </button>
              </div>
            </div>
            
            <!-- Fechas personalizadas -->
            <div class="row mt-3" v-if="dateRangeFilter === 'custom'">
              <div class="col-md-6">
                <label for="startDate" class="form-label">Fecha Inicio</label>
                <input type="date" class="form-control" id="startDate" v-model="startDate">
              </div>
              <div class="col-md-6">
                <label for="endDate" class="form-label">Fecha Fin</label>
                <input type="date" class="form-control" id="endDate" v-model="endDate">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de consumos -->
    <div class="row">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div v-if="loading" class="p-5 text-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <p class="mt-2 text-muted">Cargando datos de consumo...</p>
            </div>
            <div v-else-if="filteredConsumptions.length === 0" class="p-5 text-center">
              <Receipt class="text-muted" size="48" />
              <p class="mt-3 text-muted">No se encontraron consumos con los filtros seleccionados</p>
              <button class="btn btn-outline-primary mt-2" @click="resetFilters">
                Limpiar filtros
              </button>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col" class="border-0">N° Factura</th>
                    <th scope="col" class="border-0">Cliente</th>
                    <th scope="col" class="border-0" v-if="authStore.isSuperAdmin">Negocio</th>
                    <th scope="col" class="border-0">Fecha</th>
                    <th scope="col" class="border-0">Monto</th>
                    <th scope="col" class="border-0">Estado</th>
                    <th scope="col" class="border-0 text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="consumption in filteredConsumptions" :key="consumption.id">
                    <td>
                      <span class="badge bg-light text-dark">
                        <FileText class="me-1" size="14" /> {{ consumption.invoiceNumber || 'N/D' }}
                      </span>
                    </td>
                    <td>
                      <div class="d-flex align-items-center">
                        <div class="avatar-circle bg-primary bg-opacity-10 text-primary me-3">
                          {{ getInitials(consumption.customerName) }}
                        </div>
                        <div>
                          <router-link :to="`/admin/clients/${consumption.phoneNumber}`" class="text-decoration-none">
                            <h6 class="mb-0">{{ consumption.customerName || 'Cliente' }}</h6>
                            <small class="text-muted">{{ consumption.phoneNumber }}</small>
                          </router-link>
                        </div>
                      </div>
                    </td>
                    <td v-if="authStore.isSuperAdmin">
                      {{ getBusinessName(consumption.businessId) }}
                    </td>
                    <td>
                      {{ formatDate(consumption.date) }}
                    </td>
                    <td>
                      <span class="fw-bold">S/ {{ consumption.amount.toFixed(2) }}</span>
                    </td>
                    <td>
                      <span class="badge" :class="consumption.verified ? 'bg-success' : 'bg-warning'">
                        {{ consumption.verified ? 'Verificado' : 'Pendiente' }}
                      </span>
                    </td>
                    <td class="text-end">
                      <div class="btn-group btn-group-sm">
                        <button 
                          class="btn btn-outline-info" 
                          @click="viewReceiptDetails(consumption)"
                          title="Ver recibo"
                        >
                          <Receipt size="16" />
                        </button>
                        <button 
                          v-if="!consumption.verified"
                          class="btn btn-outline-success" 
                          @click="verifyReceipt(consumption)"
                          title="Verificar recibo"
                        >
                          <CheckCircle size="16" />
                        </button>
                        <button 
                          class="btn btn-outline-primary" 
                          @click="viewLoyaltyCard(consumption)"
                          title="Ver tarjeta de fidelidad"
                        >
                          <CreditCard size="16" />
                        </button>
                        <router-link 
                          :to="`/admin/clients/${consumption.phoneNumber}`" 
                          class="btn btn-outline-secondary"
                          title="Ver detalle del cliente"
                        >
                          <User size="16" />
                        </router-link>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer bg-white d-flex justify-content-between align-items-center">
            <div>
              <span class="text-muted">Mostrando {{ filteredConsumptions.length }} de {{ consumptions.length }} consumos</span>
            </div>
            <div>
              <span class="text-muted me-3">Total: <strong>S/ {{ totalAmount.toFixed(2) }}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de detalles del recibo -->
    <div class="modal fade" id="receiptModal" tabindex="-1" aria-labelledby="receiptModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="receiptModalLabel">Detalles del Recibo</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" v-if="selectedConsumption">
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <h6 class="text-muted mb-2">Información del Cliente</h6>
                  <p class="mb-1"><strong>Nombre:</strong> {{ selectedConsumption.customerName }}</p>
                  <p class="mb-1"><strong>Teléfono:</strong> {{ selectedConsumption.phoneNumber }}</p>
                </div>
                
                <div class="mb-3">
                  <h6 class="text-muted mb-2">Información de la Compra</h6>
                  <p class="mb-1"><strong>Fecha:</strong> {{ formatDate(selectedConsumption.date) }}</p>
                  <p class="mb-1"><strong>Monto:</strong> S/ {{ selectedConsumption.amount?.toFixed(2) }}</p>
                  <p class="mb-1"><strong>Estado:</strong> 
                    <span class="badge" :class="selectedConsumption.verified ? 'bg-success' : 'bg-warning'">
                      {{ selectedConsumption.verified ? 'Verificado' : 'Pendiente' }}
                    </span>
                  </p>
                </div>
              </div>
              <div class="col-md-6">
                <h6 class="text-muted mb-2">Imagen del Recibo</h6>
                <div class="receipt-image-container">
                  <img 
                    v-if="selectedConsumption.receiptUrl" 
                    :src="selectedConsumption.receiptUrl" 
                    alt="Recibo" 
                    class="img-fluid rounded"
                  >
                  <div v-else class="text-center p-5 bg-light rounded">
                    <i class="bi bi-image text-muted display-4"></i>
                    <p class="mt-2">Imagen no disponible</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            <button 
              v-if="selectedConsumption && !selectedConsumption.verified" 
              type="button" 
              class="btn btn-success"
              @click="verifyReceipt(selectedConsumption)"
            >
              <i class="bi bi-check-lg me-1"></i> Verificar Recibo
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { collection, getDocs, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuthStore } from '@/stores/auth';

// Importar componentes de Lucide
import { Search, XCircle, Receipt, CheckCircle, CreditCard, FileText, User } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();

// Estado
const loading = ref(true);
const consumptions = ref([]);
const businesses = ref([]);
const searchTerm = ref('');
const businessFilter = ref('');
const dateRangeFilter = ref('all');
const startDate = ref('');
const endDate = ref('');
const selectedConsumption = ref(null);

// Referencias a modales
let receiptModal = null;

// Cargar datos
onMounted(async () => {
  await loadData();
  
  // Inicializar modales
  receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
});

// Cargar datos de consumos y negocios
async function loadData() {
  loading.value = true;
  
  try {
    // Cargar negocios si es super admin
    if (authStore.isSuperAdmin) {
      const businessesSnapshot = await getDocs(collection(db, 'businesses'));
      businesses.value = businessesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    // Cargar consumos según el rol
    if (authStore.isSuperAdmin) {
      // Super admin ve todos los consumos de todos los negocios
      // Primero obtenemos todos los negocios
      const allPurchases = [];
      
      // Para cada negocio, obtenemos sus compras
      for (const business of businesses.value) {
        try {
          const businessPurchasesRef = collection(db, 'business_purchases', business.id, 'purchases');
          const purchasesSnapshot = await getDocs(businessPurchasesRef);
          
          // Agregamos cada compra con su información de negocio
          const businessPurchases = purchasesSnapshot.docs.map(doc => ({
            id: doc.id,
            businessId: business.id,
            businessName: business.name,
            ...doc.data(),
            date: doc.data().date instanceof Timestamp ? doc.data().date.toDate() : new Date(doc.data().date)
          }));
          
          allPurchases.push(...businessPurchases);
        } catch (err) {
          console.error(`Error al cargar compras del negocio ${business.id}:`, err);
        }
      }
      
      // Asignamos todas las compras a la variable reactiva
      consumptions.value = allPurchases;
      
    } else if (authStore.isBusinessAdmin) {
      // Business admin solo ve los de su negocio
      const businessId = authStore.user.businessId;
      const businessPurchasesRef = collection(db, 'business_purchases', businessId, 'purchases');
      const purchasesSnapshot = await getDocs(businessPurchasesRef);
      
      consumptions.value = purchasesSnapshot.docs.map(doc => ({
        id: doc.id,
        businessId: businessId,
        ...doc.data(),
        date: doc.data().date instanceof Timestamp ? doc.data().date.toDate() : new Date(doc.data().date)
      }));
    }
    
    console.log('Consumos cargados:', consumptions.value.length);
    
  } catch (error) {
    console.error('Error al cargar datos:', error);
  } finally {
    loading.value = false;
  }
}

// Filtrar consumos
const filteredConsumptions = computed(() => {
  let result = [...consumptions.value];
  
  // Filtrar por término de búsqueda
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    result = result.filter(consumption => 
      (consumption.customerName?.toLowerCase().includes(term) || 
       consumption.phoneNumber?.toLowerCase().includes(term))
    );
  }
  
  // Filtrar por negocio
  if (businessFilter.value) {
    result = result.filter(consumption => consumption.businessId === businessFilter.value);
  }
  
  // Filtrar por rango de fechas
  if (dateRangeFilter.value !== 'all') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateRangeFilter.value === 'today') {
      result = result.filter(consumption => {
        const consumptionDate = new Date(consumption.date);
        return consumptionDate >= today;
      });
    } else if (dateRangeFilter.value === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      
      result = result.filter(consumption => {
        const consumptionDate = new Date(consumption.date);
        return consumptionDate >= weekStart;
      });
    } else if (dateRangeFilter.value === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      result = result.filter(consumption => {
        const consumptionDate = new Date(consumption.date);
        return consumptionDate >= monthStart;
      });
    } else if (dateRangeFilter.value === 'custom' && startDate.value) {
      const start = new Date(startDate.value);
      
      result = result.filter(consumption => {
        const consumptionDate = new Date(consumption.date);
        return consumptionDate >= start;
      });
      
      if (endDate.value) {
        const end = new Date(endDate.value);
        end.setDate(end.getDate() + 1); // Incluir el día completo
        
        result = result.filter(consumption => {
          const consumptionDate = new Date(consumption.date);
          return consumptionDate < end;
        });
      }
    }
  }
  
  // Ordenar por fecha (más reciente primero)
  return result.sort((a, b) => b.date - a.date);
});

// Calcular monto total
const totalAmount = computed(() => {
  return filteredConsumptions.value.reduce((total, consumption) => {
    return total + (consumption.amount || 0);
  }, 0);
});

// Obtener nombre del negocio
function getBusinessName(businessId) {
  const business = businesses.value.find(b => b.id === businessId);
  return business ? business.name : 'Desconocido';
}

// Ver detalles del recibo
function viewReceiptDetails(consumption) {
  selectedConsumption.value = consumption;
  receiptModal.show();
}

// Verificar recibo
async function verifyReceipt(consumption) {
  try {
    let docRef;
    
    if (authStore.isSuperAdmin) {
      docRef = doc(db, 'business_purchases', consumption.businessId, 'purchases', consumption.id);
    } else {
      docRef = doc(db, 'business_purchases', authStore.user.businessId, 'purchases', consumption.id);
    }
    
    await updateDoc(docRef, {
      verified: true
    });
    
    // Actualizar localmente
    const index = consumptions.value.findIndex(c => c.id === consumption.id);
    if (index !== -1) {
      consumptions.value[index].verified = true;
    }
    
    // Cerrar modal si está abierto
    if (receiptModal && selectedConsumption.value?.id === consumption.id) {
      selectedConsumption.value.verified = true;
    }
    
  } catch (error) {
    console.error('Error al verificar recibo:', error);
  }
}

// Ver tarjeta de fidelidad
function viewLoyaltyCard(consumption) {
  const businessId = consumption.businessId || authStore.user.businessId;
  const phoneNumber = consumption.phoneNumber;
  
  if (businessId && phoneNumber) {
    window.open(`/${businessId}/${phoneNumber}`, '_blank');
  }
}

// Resetear filtros
function resetFilters() {
  searchTerm.value = '';
  businessFilter.value = '';
  dateRangeFilter.value = 'all';
  startDate.value = '';
  endDate.value = '';
}

// Formatear fecha
function formatDate(date) {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

// Obtener iniciales
function getInitials(name) {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}
</script>

<style scoped>
.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.receipt-image-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
}
</style>
