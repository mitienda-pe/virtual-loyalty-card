<template>
  <div class="consumption-list">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <button class="btn btn-primary" @click="showAddConsumptionModal">
        <i class="bi bi-plus-circle"></i> Nuevo Consumo
      </button>
    </div>
    
    <div class="card">
      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Historial de Consumos</h5>
        <div class="d-flex">
          <input 
            type="text" 
            class="form-control form-control-sm me-2" 
            placeholder="Buscar cliente..." 
            v-model="searchTerm"
            @input="filterConsumos"
          >
          <select v-model="typeFilter" class="form-select form-select-sm me-2" @change="filterConsumos">
            <option value="">Todos los tipos</option>
            <option value="purchase">Compras</option>
            <option value="reward">Premios</option>
            <option value="adjustment">Ajustes</option>
          </select>
          <select v-model="dateFilter" class="form-select form-select-sm" @change="filterConsumos">
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="year">Este año</option>
          </select>
        </div>
      </div>
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">Cargando consumos...</p>
        </div>
        
        <div v-else-if="filteredConsumos.length === 0" class="text-center py-5">
          <div class="alert alert-info" role="alert">
            <h4 class="alert-heading">No se encontraron consumos</h4>
            <p>No hay consumos registradas o ninguna coincide con los filtros seleccionados.</p>
          </div>
        </div>
        
        <div v-else>
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Puntos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="consumo in paginatedConsumos" :key="consumo.id">
                  <td>{{ formatDate(consumo.timestamp) }}</td>
                  <td>{{ consumo.clientEmail || consumo.clientName || consumo.clientId }}</td>
                  <td>
                    <span :class="`badge ${consumo.type === 'purchase' ? 'bg-primary' : consumo.type === 'reward' ? 'bg-success' : 'bg-info'}`">
                      {{ consumo.type === 'purchase' ? 'Compra' : consumo.type === 'reward' ? 'Premio' : 'Ajuste' }}
                    </span>
                  </td>
                  <td>{{ consumo.description }}</td>
                  <td>{{ consumo.amount ? `$${consumo.amount}` : '-' }}</td>
                  <td>
                    <span :class="consumo.points >= 0 ? 'text-success' : 'text-danger'">
                      {{ consumo.points >= 0 ? '+' : '' }}{{ consumo.points }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary" @click="viewConsumptionDetails(consumo)">
                      <i class="bi bi-eye"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Paginación -->
          <div class="d-flex justify-content-between align-items-center mt-4">
            <div>
              <span class="me-2">Mostrando {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredConsumos.length) }} de {{ filteredConsumos.length }}</span>
            </div>
            <nav aria-label="Navegación de páginas">
              <ul class="pagination mb-0">
                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                  <a class="page-link" href="#" @click.prevent="currentPage--">Anterior</a>
                </li>
                <li v-for="page in totalPages" :key="page" class="page-item" :class="{ active: page === currentPage }">
                  <a class="page-link" href="#" @click.prevent="currentPage = page">{{ page }}</a>
                </li>
                <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                  <a class="page-link" href="#" @click.prevent="currentPage++">Siguiente</a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para ver detalles de la transacción -->
    <div class="modal fade" id="consumptionDetailsModal" tabindex="-1" aria-labelledby="consumptionDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header" :class="selectedConsumption && selectedConsumption.type === 'purchase' ? 'bg-primary text-white' : selectedConsumption && selectedConsumption.type === 'reward' ? 'bg-success text-white' : 'bg-info text-white'">
            <h5 class="modal-title" id="consumptionDetailsModalLabel">Detalles de la Transacción</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" v-if="selectedConsumption">
            <div class="mb-3">
              <h5>Información General</h5>
              <p><strong>Fecha:</strong> {{ formatDate(selectedConsumption.timestamp) }}</p>
              <p><strong>Tipo:</strong> 
                <span :class="`badge ${selectedConsumption.type === 'purchase' ? 'bg-primary' : selectedConsumption.type === 'reward' ? 'bg-success' : 'bg-info'}`">
                  {{ selectedConsumption.type === 'purchase' ? 'Compra' : selectedConsumption.type === 'reward' ? 'Premio' : 'Ajuste' }}
                </span>
              </p>
              <p><strong>Descripción:</strong> {{ selectedConsumption.description }}</p>
              <p v-if="selectedConsumption.amount"><strong>Monto:</strong> ${{ selectedConsumption.amount }}</p>
              <p><strong>Puntos:</strong> 
                <span :class="selectedConsumption.points >= 0 ? 'text-success' : 'text-danger'">
                  {{ selectedConsumption.points >= 0 ? '+' : '' }}{{ selectedConsumption.points }}
                </span>
              </p>
            </div>
            
            <div class="mb-3">
              <h5>Información del Cliente</h5>
              <p><strong>ID:</strong> {{ selectedConsumption.clientId }}</p>
              <p v-if="clientInfo"><strong>Nombre:</strong> {{ clientInfo.name || 'Sin nombre' }}</p>
              <p v-if="clientInfo"><strong>Email:</strong> {{ clientInfo.email || 'Sin email' }}</p>
              <p v-if="clientInfo"><strong>Teléfono:</strong> {{ clientInfo.phone || 'Sin teléfono' }}</p>
              <p v-if="clientInfo"><strong>Puntos actuales:</strong> {{ clientInfo.points || 0 }}</p>
            </div>
            
            <div v-if="selectedConsumption.type === 'reward' && selectedConsumption.rewardId" class="mb-3">
              <h5>Información del Premio</h5>
              <p><strong>ID del Premio:</strong> {{ selectedConsumption.rewardId }}</p>
              <p v-if="rewardInfo"><strong>Nombre:</strong> {{ rewardInfo.name }}</p>
              <p v-if="rewardInfo"><strong>Descripción:</strong> {{ rewardInfo.description }}</p>
              <p v-if="rewardInfo"><strong>Costo en Puntos:</strong> {{ rewardInfo.pointsCost }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para añadir transacción -->
    <div class="modal fade" id="addConsumptionModal" tabindex="-1" aria-labelledby="addConsumptionModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="addConsumptionModalLabel">Nueva Transacción</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="addConsumption">
              <div class="mb-3">
                <label for="consumptionType" class="form-label">Tipo de Transacción</label>
                <select class="form-select" id="consumptionType" v-model="newConsumption.type" required>
                  <option value="purchase">Compra</option>
                  <option value="adjustment">Ajuste de Puntos</option>
                </select>
              </div>
              
              <div class="mb-3">
                <label for="clientSelect" class="form-label">Cliente</label>
                <select class="form-select" id="clientSelect" v-model="newConsumption.clientId" required>
                  <option value="" disabled selected>Seleccionar cliente</option>
                  <option v-for="client in clients" :key="client.id" :value="client.clientId">
                    {{ client.name || client.email || client.phone || client.clientId }}
                  </option>
                </select>
              </div>
              
              <div class="mb-3" v-if="newConsumption.type === 'purchase'">
                <label for="consumptionAmount" class="form-label">Monto de la Compra ($)</label>
                <input type="number" class="form-control" id="consumptionAmount" v-model.number="newConsumption.amount" min="0.01" step="0.01" required>
              </div>
              
              <div class="mb-3" v-if="newConsumption.type === 'adjustment'">
                <label for="consumptionPoints" class="form-label">Puntos</label>
                <input type="number" class="form-control" id="consumptionPoints" v-model.number="newConsumption.points" required>
                <small class="form-text text-muted">Usa valores negativos para restar puntos.</small>
              </div>
              
              <div class="mb-3">
                <label for="consumptionDescription" class="form-label">Descripción</label>
                <input type="text" class="form-control" id="consumptionDescription" v-model="newConsumption.description" required>
              </div>
              
              <div class="d-grid">
                <button type="submit" class="btn btn-primary" :disabled="addingConsumption">
                  <span v-if="addingConsumption" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Guardar Transacción
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
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { 
  collection, query, where, orderBy, getDocs, getDoc, doc,
  addDoc, updateDoc, serverTimestamp, Timestamp, increment
} from 'firebase/firestore';
import { db } from '@/firebase';

const authStore = useAuthStore();
const consumos = ref([]);
const filteredConsumos = ref([]);
const loading = ref(true);
const searchTerm = ref('');
const typeFilter = ref('');
const dateFilter = ref('all');
const selectedConsumption = ref(null);
const clientInfo = ref(null);
const rewardInfo = ref(null);
const clients = ref([]);

// Paginación
const pageSize = 10;
const currentPage = ref(1);
const totalPages = computed(() => Math.ceil(filteredConsumos.value.length / pageSize));
const paginatedConsumos = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredConsumos.value.slice(start, end);
});

// Para el modal de añadir transacción
const newConsumption = ref({
  type: 'purchase',
  clientId: '',
  amount: 0,
  points: 0,
  description: ''
});
const addingConsumption = ref(false);

// Referencias a los modales de Bootstrap
let consumptionDetailsModal = null;
let addConsumptionModal = null;

const businessId = computed(() => authStore.businessId);

// Reiniciar la página actual cuando cambian los filtros
watch([searchTerm, typeFilter, dateFilter], () => {
  currentPage.value = 1;
});

onMounted(async () => {
  if (authStore.isAuthenticated && (authStore.isBusinessAdmin || authStore.isSuperAdmin)) {
    // Inicializar modales de Bootstrap
    consumptionDetailsModal = new bootstrap.Modal(document.getElementById('consumptionDetailsModal'));
    addConsumptionModal = new bootstrap.Modal(document.getElementById('addConsumptionModal'));
    
    if (authStore.businessId) {
      await Promise.all([
        loadConsumos(),
        loadClients()
      ]);
      loading.value = false;
    }
  }
});

watch(
  () => authStore.businessId,
  async (newBusinessId, oldBusinessId) => {
    if (newBusinessId && newBusinessId !== oldBusinessId && authStore.isAuthenticated && (authStore.isBusinessAdmin || authStore.isSuperAdmin)) {
      await Promise.all([
        loadConsumos(),
        loadClients()
      ]);
      loading.value = false;
    }
  }
);

async function loadConsumos() {
  try {
    // Query to subcollection 'purchases' inside the business document
    const consumosQuery = collection(db, "business_invoices", businessId.value, "purchases");
    
    const snapshot = await getDocs(consumosQuery);
    
    // Obtener datos de clientes para mostrar emails en lugar de IDs
    const consumosWithClientInfo = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const consumo = {
        id: docSnap.id,
        ...docSnap.data()
      };
      
      try {
        // Intentar obtener el email del cliente
        const userDoc = await getDoc(doc(db, "users", consumo.clientId));
        if (userDoc.exists()) {
          consumo.clientEmail = userDoc.data().email;
          consumo.clientName = userDoc.data().displayName;
        }
      } catch (error) {
        console.error("Error al obtener datos del cliente:", error);
      }
      
      return consumo;
    }));
    
    consumos.value = consumosWithClientInfo;
    filterConsumos();
  } catch (error) {
    console.error("Error al cargar consumos:", error);
  }
}

async function loadClients() {
  try {
    const clientsQuery = query(
      collection(db, "business_customers"),
      where("businessSlug", "==", businessId.value)
    );
    
    const clientsSnapshot = await getDocs(clientsQuery);
    
    // Obtener información adicional de cada cliente
    const clientsData = await Promise.all(clientsSnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      
      try {
        const userDoc = await getDoc(doc(db, "users", data.clientId));
        if (userDoc.exists()) {
          return {
            id: docSnap.id,
            clientId: data.clientId,
            email: userDoc.data().email,
            phone: userDoc.data().phone,
            name: userDoc.data().displayName,
            points: data.points || 0,
            ...data
          };
        }
      } catch (error) {
        console.error("Error al obtener datos del cliente:", error);
      }
      
      return {
        id: docSnap.id,
        clientId: data.clientId,
        points: data.points || 0,
        ...data
      };
    }));
    
    clients.value = clientsData;
  } catch (error) {
    console.error("Error al cargar clientes:", error);
  }
}

function filterConsumos() {
  let filtered = [...consumos.value];
  
  // Filtrar por término de búsqueda
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    filtered = filtered.filter(consumo => 
      (consumo.clientEmail && consumo.clientEmail.toLowerCase().includes(term)) ||
      (consumo.clientName && consumo.clientName.toLowerCase().includes(term)) ||
      (consumo.clientId && consumo.clientId.toLowerCase().includes(term)) ||
      (consumo.description && consumo.description.toLowerCase().includes(term))
    );
  }
  
  // Filtrar por tipo
  if (typeFilter.value) {
    filtered = filtered.filter(consumo => consumo.type === typeFilter.value);
  }
  
  // Filtrar por fecha
  if (dateFilter.value !== 'all') {
    const now = new Date();
    let startDate;
    
    switch (dateFilter.value) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        // Obtener el primer día de la semana (domingo)
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    filtered = filtered.filter(consumo => {
      if (!consumo.timestamp) return false;
      const consumoDate = consumo.timestamp.toDate ? consumo.timestamp.toDate() : new Date(consumo.timestamp);
      return consumoDate >= startDate;
    });
  }
  
  filteredConsumos.value = filtered;
}

async function viewConsumptionDetails(consumo) {
  selectedConsumption.value = consumo;
  
  // Cargar información del cliente
  await loadClientInfo(consumo.clientId);
  
  // Si es un canje de premio, cargar información del premio
  if (consumo.type === 'reward' && consumo.rewardId) {
    await loadRewardInfo(consumo.rewardId);
  } else {
    rewardInfo.value = null;
  }
  
  consumptionDetailsModal.show();
}

async function loadClientInfo(clientId) {
  try {
    // Buscar la relación cliente-negocio
    const clientBusinessQuery = query(
      collection(db, "client_businesses"),
      where("clientId", "==", clientId),
      where("businessId", "==", businessId.value)
    );
    
    const clientBusinessSnapshot = await getDocs(clientBusinessQuery);
    
    if (!clientBusinessSnapshot.empty) {
      const clientBusinessData = clientBusinessSnapshot.docs[0].data();
      
      // Obtener información del usuario
      const userDoc = await getDoc(doc(db, "users", clientId));
      
      if (userDoc.exists()) {
        clientInfo.value = {
          id: clientId,
          email: userDoc.data().email,
          phone: userDoc.data().phone,
          name: userDoc.data().displayName,
          points: clientBusinessData.points || 0
        };
      } else {
        clientInfo.value = {
          id: clientId,
          points: clientBusinessData.points || 0
        };
      }
    } else {
      clientInfo.value = { id: clientId };
    }
  } catch (error) {
    console.error("Error al cargar información del cliente:", error);
    clientInfo.value = { id: clientId };
  }
}

async function loadRewardInfo(rewardId) {
  try {
    const rewardDoc = await getDoc(doc(db, "rewards", rewardId));
    
    if (rewardDoc.exists()) {
      rewardInfo.value = {
        id: rewardId,
        ...rewardDoc.data()
      };
    } else {
      rewardInfo.value = { id: rewardId };
    }
  } catch (error) {
    console.error("Error al cargar información del premio:", error);
    rewardInfo.value = { id: rewardId };
  }
}

function showAddConsumptionModal() {
  newConsumption.value = {
    type: 'purchase',
    clientId: '',
    amount: 0,
    points: 0,
    description: ''
  };
  addConsumptionModal.show();
}

async function addConsumption() {
  if (!newConsumption.value.clientId || 
      (newConsumption.value.type === 'purchase' && newConsumption.value.amount <= 0) ||
      (newConsumption.value.type === 'adjustment' && newConsumption.value.points === 0)) {
    alert("Por favor, completa todos los campos requeridos con valores válidos.");
    return;
  }
  
  addingConsumption.value = true;
  
  try {
    // Buscar la relación cliente-negocio
    const clientBusinessQuery = query(
      collection(db, "client_businesses"),
      where("clientId", "==", newConsumption.value.clientId),
      where("businessId", "==", businessId.value)
    );
    
    const clientBusinessSnapshot = await getDocs(clientBusinessQuery);
    
    if (clientBusinessSnapshot.empty) {
      throw new Error("El cliente no está registrado en este negocio.");
    }
    
    const clientBusinessDoc = clientBusinessSnapshot.docs[0];
    const clientBusinessData = clientBusinessDoc.data();
    
    // Obtener información del negocio
    const businessDoc = await getDoc(doc(db, "businesses", businessId.value));
    
    if (!businessDoc.exists()) {
      throw new Error("No se encontró información del negocio.");
    }
    
    const businessData = businessDoc.data();
    
    let pointsToAdd = 0;
    let consumoData = {
      clientId: newConsumption.value.clientId,
      businessId: businessId.value,
      businessName: businessData.name,
      description: newConsumption.value.description,
      timestamp: serverTimestamp()
    };
    
    if (newConsumption.value.type === 'purchase') {
      // Calcular puntos basados en el monto de la compra
      const pointsPerCurrency = businessData.pointsPerCurrency || 1;
      pointsToAdd = Math.floor(newConsumption.value.amount * pointsPerCurrency);
      
      consumoData = {
        ...consumoData,
        type: 'purchase',
        amount: newConsumption.value.amount,
        points: pointsToAdd
      };
    } else if (newConsumption.value.type === 'adjustment') {
      pointsToAdd = newConsumption.value.points;
      
      consumoData = {
        ...consumoData,
        type: 'adjustment',
        points: pointsToAdd
      };
    }
    
    // Verificar si hay suficientes puntos en caso de ajuste negativo
    if (pointsToAdd < 0 && Math.abs(pointsToAdd) > (clientBusinessData.points || 0)) {
      throw new Error("El cliente no tiene suficientes puntos para realizar este ajuste.");
    }
    
    // Crear transacción
    await addDoc(collection(db, "transactions"), consumoData);
    
    // Actualizar puntos del cliente
    await updateDoc(doc(db, "client_businesses", clientBusinessDoc.id), {
      points: increment(pointsToAdd),
      updatedAt: serverTimestamp()
    });
    
    // Recargar datos
    await loadConsumos();
    
    alert("Transacción registrada exitosamente.");
    addConsumptionModal.hide();
  } catch (error) {
    console.error("Error al registrar transacción:", error);
    alert("Error al registrar transacción: " + error.message);
  } finally {
    addingConsumption.value = false;
  }
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
</script>

<style scoped>
.consumption-list {
  padding-bottom: 2rem;
}
</style>
