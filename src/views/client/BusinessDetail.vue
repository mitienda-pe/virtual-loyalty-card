<template>
  <div class="business-detail">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2">Cargando información del negocio...</p>
    </div>
    
    <div v-else-if="!business" class="alert alert-danger" role="alert">
      No se encontró el negocio solicitado.
    </div>
    
    <div v-else>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>{{ business.name }}</h2>
        <router-link to="/client/businesses" class="btn btn-outline-primary">
          <i class="bi bi-arrow-left"></i> Volver a mis negocios
        </router-link>
      </div>
      
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card mb-4">
            <div class="card-header bg-primary text-white">
              <h5 class="card-title mb-0">Mi Tarjeta de Fidelidad</h5>
            </div>
            <div class="card-body">
              <div class="loyalty-card p-3 border rounded bg-light">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h4>{{ business.name }}</h4>
                  <span class="badge bg-success">{{ calculateLevel(totalPoints) }}</span>
                </div>
                
                <div class="mb-3">
                  <p class="mb-1"><strong>Cliente:</strong> {{ authStore.user?.email }}</p>
                  <p class="mb-1"><strong>ID de Cliente:</strong> {{ clientId }}</p>
                  <p class="mb-0"><strong>Desde:</strong> {{ formatDate(clientBusiness.createdAt) }}</p>
                </div>
                
                <!-- Información consolidada -->
                <div class="mb-3">
                  <div class="d-flex justify-content-between mb-1">
                    <span><strong>Puntos acumulados:</strong></span>
                    <span>{{ totalPoints }} pts</span>
                  </div>
                  <div class="progress">
                    <div 
                      class="progress-bar bg-success" 
                      role="progressbar" 
                      :style="`width: ${calculateProgress(totalPoints)}%`" 
                      :aria-valuenow="calculateProgress(totalPoints)" 
                      aria-valuemin="0" 
                      aria-valuemax="100">
                      {{ calculateProgress(totalPoints) }}%
                    </div>
                  </div>
                </div>

                <!-- Estadísticas consolidadas -->
                <div class="row text-center mt-3">
                  <div class="col-4">
                    <div class="stat-item">
                      <div class="stat-value">{{ totalPurchases }}</div>
                      <div class="stat-label">Compras</div>
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="stat-item">
                      <div class="stat-value">{{ formatCurrency(totalSpent) }}</div>
                      <div class="stat-label">Total Gastado</div>
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="stat-item">
                      <div class="stat-value">{{ uniqueLocations }}</div>
                      <div class="stat-label">{{ uniqueLocations === 1 ? 'Ubicación' : 'Ubicaciones' }}</div>
                    </div>
                  </div>
                </div>
                
                <div class="text-center mt-4">
                  <img 
                    :src="`https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(clientId)}&chs=200x200&choe=UTF-8&chld=L|2`" 
                    alt="QR Code" 
                    class="img-fluid qr-code"
                  />
                  <p class="mt-2 small text-muted">Muestra este código al realizar una compra</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="card mb-4">
            <div class="card-header bg-info text-white">
              <h5 class="card-title mb-0">Información del Negocio</h5>
            </div>
            <div class="card-body">
              <p v-if="business.description">{{ business.description }}</p>
              
              <!-- Mostrar información de entidades si hay múltiples -->
              <div v-if="hasMultipleEntities" class="mt-3">
                <h6>Ubicaciones Disponibles:</h6>
                <div class="entities-list">
                  <div 
                    v-for="entity in business.businessEntities"
                    :key="entity.id"
                    class="entity-card mb-2"
                  >
                    <div class="entity-header">
                      <strong>{{ entity.businessName }}</strong>
                      <small class="text-muted">RUC: {{ entity.ruc }}</small>
                    </div>
                    <div class="entity-address">
                      <i class="bi bi-geo-alt"></i>
                      {{ entity.address }}
                    </div>
                    <div v-if="entity.locations?.length" class="entity-locations">
                      <small class="text-muted">
                        Ubicaciones: {{ entity.locations.join(', ') }}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Información básica para negocio con una sola entidad -->
              <div v-else-if="business.businessEntities?.length === 1">
                <p v-if="business.businessEntities[0].address">
                  <strong>Dirección:</strong> {{ business.businessEntities[0].address }}
                </p>
                <p><strong>RUC:</strong> {{ business.businessEntities[0].ruc }}</p>
              </div>

              <!-- Información adicional del negocio -->
              <div class="mt-3">
                <p v-if="business.phone"><strong>Teléfono:</strong> {{ business.phone }}</p>
                <p v-if="business.email"><strong>Email:</strong> {{ business.email }}</p>
                <p v-if="business.website">
                  <strong>Sitio web:</strong> 
                  <a :href="business.website" target="_blank">{{ business.website }}</a>
                </p>
                
                <div v-if="business.config?.purchasesRequired" class="alert alert-info mt-3">
                  <p class="mb-0">
                    <strong>Programa de Fidelidad:</strong> 
                    Obtén una recompensa cada {{ business.config.purchasesRequired }} compras
                  </p>
                  <p v-if="business.config.reward" class="mb-0">
                    <strong>Recompensa:</strong> {{ business.config.reward }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-header bg-success text-white">
              <h5 class="card-title mb-0">Progreso hacia Recompensa</h5>
            </div>
            <div class="card-body">
              <div v-if="business.config?.purchasesRequired">
                <div class="d-flex justify-content-between mb-2">
                  <span>Progreso actual:</span>
                  <span>{{ totalPurchases }} / {{ business.config.purchasesRequired }} compras</span>
                </div>
                <div class="progress mb-3">
                  <div 
                    class="progress-bar bg-success" 
                    role="progressbar" 
                    :style="`width: ${rewardProgress}%`"
                    :aria-valuenow="rewardProgress" 
                    aria-valuemin="0" 
                    aria-valuemax="100">
                    {{ Math.round(rewardProgress) }}%
                  </div>
                </div>
                
                <div v-if="purchasesUntilReward === 0" class="alert alert-success">
                  <strong>¡Felicidades!</strong> Has alcanzado tu recompensa: {{ business.config.reward }}
                </div>
                <div v-else class="alert alert-info">
                  Te faltan <strong>{{ purchasesUntilReward }}</strong> compras para obtener tu recompensa
                </div>
              </div>
              <div v-else class="text-center py-3">
                <p class="text-muted">Información de recompensas no disponible.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0">Mi Historial de Compras</h5>
          <div v-if="hasMultipleEntities" class="entity-filter">
            <select v-model="selectedEntityFilter" class="form-select form-select-sm">
              <option value="">Todas las ubicaciones</option>
              <option 
                v-for="entity in business.businessEntities" 
                :key="entity.id"
                :value="entity.id"
              >
                {{ entity.businessName }}
              </option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div v-if="filteredTransactions.length === 0" class="text-center py-4">
            <p class="text-muted">No tienes compras registradas{{ selectedEntityFilter ? ' en esta ubicación' : '' }}.</p>
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th v-if="hasMultipleEntities">Ubicación</th>
                  <th>Monto</th>
                  <th>Comprobante</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="transaction in filteredTransactions" :key="transaction.id">
                  <td>{{ formatDate(transaction.date) }}</td>
                  <td v-if="hasMultipleEntities">
                    <PurchaseEntityInfo :entity-id="transaction.entityId" :entities="business.businessEntities" />
                  </td>
                  <td>{{ formatCurrency(transaction.amount) }}</td>
                  <td>
                    <span v-if="transaction.invoiceNumber" class="badge bg-secondary">
                      {{ transaction.invoiceNumber }}
                    </span>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>
                    <span :class="`badge ${transaction.verified ? 'bg-success' : 'bg-warning'}`">
                      {{ transaction.verified ? 'Verificado' : 'Pendiente' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Paginación si hay muchas transacciones -->
          <nav v-if="totalTransactions > transactionsPerPage" aria-label="Paginación de transacciones">
            <ul class="pagination justify-content-center">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button class="page-link" @click="changePage(currentPage - 1)" :disabled="currentPage === 1">
                  Anterior
                </button>
              </li>
              <li 
                v-for="page in totalPages" 
                :key="page"
                class="page-item" 
                :class="{ active: page === currentPage }"
              >
                <button class="page-link" @click="changePage(page)">{{ page }}</button>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button class="page-link" @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages">
                  Siguiente
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { 
  doc, getDoc, collection, query, where, orderBy, limit, getDocs,
  addDoc, updateDoc, serverTimestamp, startAfter 
} from 'firebase/firestore';
import { db } from '@/firebase';
import PurchaseEntityInfo from '@/components/customer/PurchaseEntityInfo.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const businessId = ref(route.params.businessId);
const business = ref(null);
const clientBusiness = ref({});
const clientId = ref('');
const transactions = ref([]);
const allTransactions = ref([]);
const loading = ref(true);

// Filtros y paginación
const selectedEntityFilter = ref('');
const currentPage = ref(1);
const transactionsPerPage = ref(10);

onMounted(async () => {
  if (authStore.isAuthenticated && authStore.isBusinessClient) {
    clientId.value = authStore.user.uid;
    await loadBusinessData();
    await loadClientBusinessData();
    await loadTransactions();
    loading.value = false;
  }
});

// Computed properties
const hasMultipleEntities = computed(() => {
  return business.value?.businessEntities?.length > 1;
});

const totalPoints = computed(() => {
  return clientBusiness.value.points || 0;
});

const totalPurchases = computed(() => {
  return allTransactions.value.filter(t => t.type === 'purchase').length;
});

const totalSpent = computed(() => {
  return allTransactions.value
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
});

const uniqueLocations = computed(() => {
  if (!hasMultipleEntities.value) return 1;
  const entityIds = new Set(allTransactions.value.map(t => t.entityId).filter(Boolean));
  return entityIds.size || 1;
});

const rewardProgress = computed(() => {
  if (!business.value?.config?.purchasesRequired) return 0;
  return Math.min((totalPurchases.value / business.value.config.purchasesRequired) * 100, 100);
});

const purchasesUntilReward = computed(() => {
  if (!business.value?.config?.purchasesRequired) return 0;
  return Math.max(business.value.config.purchasesRequired - totalPurchases.value, 0);
});

const filteredTransactions = computed(() => {
  let filtered = allTransactions.value;
  
  if (selectedEntityFilter.value) {
    filtered = filtered.filter(t => t.entityId === selectedEntityFilter.value);
  }
  
  // Paginación
  const start = (currentPage.value - 1) * transactionsPerPage.value;
  const end = start + transactionsPerPage.value;
  
  return filtered.slice(start, end);
});

const totalTransactions = computed(() => {
  return selectedEntityFilter.value 
    ? allTransactions.value.filter(t => t.entityId === selectedEntityFilter.value).length
    : allTransactions.value.length;
});

const totalPages = computed(() => {
  return Math.ceil(totalTransactions.value / transactionsPerPage.value);
});

// Watchers
watch(selectedEntityFilter, () => {
  currentPage.value = 1; // Reset página al cambiar filtro
});

// Métodos
async function loadBusinessData() {
  try {
    const businessDoc = await getDoc(doc(db, "businesses", businessId.value));
    if (businessDoc.exists()) {
      business.value = {
        id: businessDoc.id,
        ...businessDoc.data()
      };
    } else {
      business.value = null;
    }
  } catch (error) {
    console.error("Error al cargar datos del negocio:", error);
    business.value = null;
  }
}

async function loadClientBusinessData() {
  try {
    const clientBusinessQuery = query(
      collection(db, "client_businesses"),
      where("clientId", "==", authStore.user.uid),
      where("businessId", "==", businessId.value)
    );
    
    const snapshot = await getDocs(clientBusinessQuery);
    if (!snapshot.empty) {
      clientBusiness.value = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };
    } else {
      // Si no existe la relación, redirigir a la lista de negocios
      router.push('/client/businesses');
    }
  } catch (error) {
    console.error("Error al cargar datos de cliente-negocio:", error);
  }
}

async function loadTransactions() {
  try {
    // Cargar desde customer_purchases (nueva estructura)
    const purchasesQuery = query(
      collection(db, "customer_purchases", authStore.user.uid, "purchases"),
      where("businessSlug", "==", businessId.value),
      orderBy("date", "desc")
    );
    
    const snapshot = await getDocs(purchasesQuery);
    allTransactions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      type: 'purchase',
      ...doc.data()
    }));
    
  } catch (error) {
    console.error("Error al cargar transacciones:", error);
    // Fallback a estructura antigua
    await loadTransactionsLegacy();
  }
}

async function loadTransactionsLegacy() {
  try {
    const transactionsQuery = query(
      collection(db, "transactions"),
      where("clientId", "==", authStore.user.uid),
      where("businessId", "==", businessId.value),
      orderBy("timestamp", "desc")
    );
    
    const snapshot = await getDocs(transactionsQuery);
    allTransactions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      date: doc.data().timestamp,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error al cargar transacciones (legacy):", error);
  }
}

function changePage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

function calculateLevel(points) {
  if (points >= 1000) return "Platino";
  if (points >= 500) return "Oro";
  if (points >= 200) return "Plata";
  return "Bronce";
}

function calculateProgress(points) {
  if (points >= 1000) return 100;
  if (points >= 500) return Math.round((points - 500) / 5) + 50;
  if (points >= 200) return Math.round((points - 200) / 6) + 20;
  return Math.round(points / 2);
}

function formatDate(timestamp) {
  if (!timestamp) return 'Fecha desconocida';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(amount || 0);
}
</script>

<style scoped>
.business-detail {
  padding-bottom: 2rem;
}

.loyalty-card {
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.qr-code {
  max-width: 200px;
  margin: 0 auto;
}

.stat-item {
  padding: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
  text-transform: uppercase;
}

.entity-card {
  border: 1px solid #e9ecef;
  border-radius: 0.375rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
}

.entity-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.entity-address {
  color: #6c757d;
  font-size: 0.9rem;
}

.entity-address i {
  margin-right: 0.25rem;
}

.entity-locations {
  margin-top: 0.25rem;
}

.entities-list {
  max-height: 300px;
  overflow-y: auto;
}

.entity-filter .form-select {
  min-width: 200px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .entity-filter {
    margin-top: 0.5rem;
  }
  
  .card-header {
    flex-direction: column;
    align-items: stretch !important;
  }
}
</style>
