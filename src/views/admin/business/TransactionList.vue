<template>
  <div class="transaction-list">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <button class="btn btn-primary" @click="showAddTransactionModal">
        <i class="bi bi-plus-circle"></i> Nueva Transacción
      </button>
    </div>
    
    <div class="card">
      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Historial de Transacciones</h5>
        <div class="d-flex">
          <input 
            type="text" 
            class="form-control form-control-sm me-2" 
            placeholder="Buscar cliente..." 
            v-model="searchTerm"
            @input="filterTransactions"
          >
          <select v-model="typeFilter" class="form-select form-select-sm me-2" @change="filterTransactions">
            <option value="">Todos los tipos</option>
            <option value="purchase">Compras</option>
            <option value="reward">Premios</option>
            <option value="adjustment">Ajustes</option>
          </select>
          <select v-model="dateFilter" class="form-select form-select-sm" @change="filterTransactions">
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
          <p class="mt-2">Cargando transacciones...</p>
        </div>
        
        <div v-else-if="filteredTransactions.length === 0" class="text-center py-5">
          <div class="alert alert-info" role="alert">
            <h4 class="alert-heading">No se encontraron transacciones</h4>
            <p>No hay transacciones registradas o ninguna coincide con los filtros seleccionados.</p>
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
                <tr v-for="transaction in paginatedTransactions" :key="transaction.id">
                  <td>{{ formatDate(transaction.timestamp) }}</td>
                  <td>{{ transaction.clientEmail || transaction.clientName || transaction.clientId }}</td>
                  <td>
                    <span :class="`badge ${transaction.type === 'purchase' ? 'bg-primary' : transaction.type === 'reward' ? 'bg-success' : 'bg-info'}`">
                      {{ transaction.type === 'purchase' ? 'Compra' : transaction.type === 'reward' ? 'Premio' : 'Ajuste' }}
                    </span>
                  </td>
                  <td>{{ transaction.description }}</td>
                  <td>{{ transaction.amount ? `$${transaction.amount}` : '-' }}</td>
                  <td>
                    <span :class="transaction.points >= 0 ? 'text-success' : 'text-danger'">
                      {{ transaction.points >= 0 ? '+' : '' }}{{ transaction.points }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary" @click="viewTransactionDetails(transaction)">
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
              <span class="me-2">Mostrando {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredTransactions.length) }} de {{ filteredTransactions.length }}</span>
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
    <div class="modal fade" id="transactionDetailsModal" tabindex="-1" aria-labelledby="transactionDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header" :class="selectedTransaction && selectedTransaction.type === 'purchase' ? 'bg-primary text-white' : selectedTransaction && selectedTransaction.type === 'reward' ? 'bg-success text-white' : 'bg-info text-white'">
            <h5 class="modal-title" id="transactionDetailsModalLabel">Detalles de la Transacción</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" v-if="selectedTransaction">
            <div class="mb-3">
              <h5>Información General</h5>
              <p><strong>Fecha:</strong> {{ formatDate(selectedTransaction.timestamp) }}</p>
              <p><strong>Tipo:</strong> 
                <span :class="`badge ${selectedTransaction.type === 'purchase' ? 'bg-primary' : selectedTransaction.type === 'reward' ? 'bg-success' : 'bg-info'}`">
                  {{ selectedTransaction.type === 'purchase' ? 'Compra' : selectedTransaction.type === 'reward' ? 'Premio' : 'Ajuste' }}
                </span>
              </p>
              <p><strong>Descripción:</strong> {{ selectedTransaction.description }}</p>
              <p v-if="selectedTransaction.amount"><strong>Monto:</strong> ${{ selectedTransaction.amount }}</p>
              <p><strong>Puntos:</strong> 
                <span :class="selectedTransaction.points >= 0 ? 'text-success' : 'text-danger'">
                  {{ selectedTransaction.points >= 0 ? '+' : '' }}{{ selectedTransaction.points }}
                </span>
              </p>
            </div>
            
            <div class="mb-3">
              <h5>Información del Cliente</h5>
              <p><strong>ID:</strong> {{ selectedTransaction.clientId }}</p>
              <p v-if="clientInfo"><strong>Nombre:</strong> {{ clientInfo.name || 'Sin nombre' }}</p>
              <p v-if="clientInfo"><strong>Email:</strong> {{ clientInfo.email || 'Sin email' }}</p>
              <p v-if="clientInfo"><strong>Teléfono:</strong> {{ clientInfo.phone || 'Sin teléfono' }}</p>
              <p v-if="clientInfo"><strong>Puntos actuales:</strong> {{ clientInfo.points || 0 }}</p>
            </div>
            
            <div v-if="selectedTransaction.type === 'reward' && selectedTransaction.rewardId" class="mb-3">
              <h5>Información del Premio</h5>
              <p><strong>ID del Premio:</strong> {{ selectedTransaction.rewardId }}</p>
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
    <div class="modal fade" id="addTransactionModal" tabindex="-1" aria-labelledby="addTransactionModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="addTransactionModalLabel">Nueva Transacción</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="addTransaction">
              <div class="mb-3">
                <label for="transactionType" class="form-label">Tipo de Transacción</label>
                <select class="form-select" id="transactionType" v-model="newTransaction.type" required>
                  <option value="purchase">Compra</option>
                  <option value="adjustment">Ajuste de Puntos</option>
                </select>
              </div>
              
              <div class="mb-3">
                <label for="clientSelect" class="form-label">Cliente</label>
                <select class="form-select" id="clientSelect" v-model="newTransaction.clientId" required>
                  <option value="" disabled selected>Seleccionar cliente</option>
                  <option v-for="client in clients" :key="client.id" :value="client.clientId">
                    {{ client.name || client.email || client.phone || client.clientId }}
                  </option>
                </select>
              </div>
              
              <div class="mb-3" v-if="newTransaction.type === 'purchase'">
                <label for="transactionAmount" class="form-label">Monto de la Compra ($)</label>
                <input type="number" class="form-control" id="transactionAmount" v-model.number="newTransaction.amount" min="0.01" step="0.01" required>
              </div>
              
              <div class="mb-3" v-if="newTransaction.type === 'adjustment'">
                <label for="transactionPoints" class="form-label">Puntos</label>
                <input type="number" class="form-control" id="transactionPoints" v-model.number="newTransaction.points" required>
                <small class="form-text text-muted">Usa valores negativos para restar puntos.</small>
              </div>
              
              <div class="mb-3">
                <label for="transactionDescription" class="form-label">Descripción</label>
                <input type="text" class="form-control" id="transactionDescription" v-model="newTransaction.description" required>
              </div>
              
              <div class="d-grid">
                <button type="submit" class="btn btn-primary" :disabled="addingTransaction">
                  <span v-if="addingTransaction" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
const transactions = ref([]);
const filteredTransactions = ref([]);
const loading = ref(true);
const searchTerm = ref('');
const typeFilter = ref('');
const dateFilter = ref('all');
const selectedTransaction = ref(null);
const clientInfo = ref(null);
const rewardInfo = ref(null);
const clients = ref([]);

// Paginación
const pageSize = 10;
const currentPage = ref(1);
const totalPages = computed(() => Math.ceil(filteredTransactions.value.length / pageSize));
const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredTransactions.value.slice(start, end);
});

// Para el modal de añadir transacción
const newTransaction = ref({
  type: 'purchase',
  clientId: '',
  amount: 0,
  points: 0,
  description: ''
});
const addingTransaction = ref(false);

// Referencias a los modales de Bootstrap
let transactionDetailsModal = null;
let addTransactionModal = null;

const businessId = computed(() => authStore.businessId);

// Reiniciar la página actual cuando cambian los filtros
watch([searchTerm, typeFilter, dateFilter], () => {
  currentPage.value = 1;
});

onMounted(async () => {
  if (authStore.isAuthenticated && (authStore.isBusinessAdmin || authStore.isSuperAdmin)) {
    // Inicializar modales de Bootstrap
    transactionDetailsModal = new bootstrap.Modal(document.getElementById('transactionDetailsModal'));
    addTransactionModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    
    if (authStore.businessId) {
      await Promise.all([
        loadTransactions(),
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
        loadTransactions(),
        loadClients()
      ]);
      loading.value = false;
    }
  }
);

async function loadTransactions() {
  try {
    const transactionsQuery = query(
      collection(db, "business_invoices"),
      where("businessSlug", "==", businessId.value),
      orderBy("timestamp", "desc")
    );
    
    const snapshot = await getDocs(transactionsQuery);
    
    // Obtener datos de clientes para mostrar emails en lugar de IDs
    const transactionsWithClientInfo = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const transaction = {
        id: docSnap.id,
        ...docSnap.data()
      };
      
      try {
        // Intentar obtener el email del cliente
        const userDoc = await getDoc(doc(db, "users", transaction.clientId));
        if (userDoc.exists()) {
          transaction.clientEmail = userDoc.data().email;
          transaction.clientName = userDoc.data().displayName;
        }
      } catch (error) {
        console.error("Error al obtener datos del cliente:", error);
      }
      
      return transaction;
    }));
    
    transactions.value = transactionsWithClientInfo;
    filterTransactions();
  } catch (error) {
    console.error("Error al cargar transacciones:", error);
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

function filterTransactions() {
  let filtered = [...transactions.value];
  
  // Filtrar por término de búsqueda
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    filtered = filtered.filter(transaction => 
      (transaction.clientEmail && transaction.clientEmail.toLowerCase().includes(term)) ||
      (transaction.clientName && transaction.clientName.toLowerCase().includes(term)) ||
      (transaction.clientId && transaction.clientId.toLowerCase().includes(term)) ||
      (transaction.description && transaction.description.toLowerCase().includes(term))
    );
  }
  
  // Filtrar por tipo
  if (typeFilter.value) {
    filtered = filtered.filter(transaction => transaction.type === typeFilter.value);
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
    
    filtered = filtered.filter(transaction => {
      if (!transaction.timestamp) return false;
      const transactionDate = transaction.timestamp.toDate ? transaction.timestamp.toDate() : new Date(transaction.timestamp);
      return transactionDate >= startDate;
    });
  }
  
  filteredTransactions.value = filtered;
}

async function viewTransactionDetails(transaction) {
  selectedTransaction.value = transaction;
  
  // Cargar información del cliente
  await loadClientInfo(transaction.clientId);
  
  // Si es un canje de premio, cargar información del premio
  if (transaction.type === 'reward' && transaction.rewardId) {
    await loadRewardInfo(transaction.rewardId);
  } else {
    rewardInfo.value = null;
  }
  
  transactionDetailsModal.show();
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

function showAddTransactionModal() {
  newTransaction.value = {
    type: 'purchase',
    clientId: '',
    amount: 0,
    points: 0,
    description: ''
  };
  addTransactionModal.show();
}

async function addTransaction() {
  if (!newTransaction.value.clientId || 
      (newTransaction.value.type === 'purchase' && newTransaction.value.amount <= 0) ||
      (newTransaction.value.type === 'adjustment' && newTransaction.value.points === 0)) {
    alert("Por favor, completa todos los campos requeridos con valores válidos.");
    return;
  }
  
  addingTransaction.value = true;
  
  try {
    // Buscar la relación cliente-negocio
    const clientBusinessQuery = query(
      collection(db, "client_businesses"),
      where("clientId", "==", newTransaction.value.clientId),
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
    let transactionData = {
      clientId: newTransaction.value.clientId,
      businessId: businessId.value,
      businessName: businessData.name,
      description: newTransaction.value.description,
      timestamp: serverTimestamp()
    };
    
    if (newTransaction.value.type === 'purchase') {
      // Calcular puntos basados en el monto de la compra
      const pointsPerCurrency = businessData.pointsPerCurrency || 1;
      pointsToAdd = Math.floor(newTransaction.value.amount * pointsPerCurrency);
      
      transactionData = {
        ...transactionData,
        type: 'purchase',
        amount: newTransaction.value.amount,
        points: pointsToAdd
      };
    } else if (newTransaction.value.type === 'adjustment') {
      pointsToAdd = newTransaction.value.points;
      
      transactionData = {
        ...transactionData,
        type: 'adjustment',
        points: pointsToAdd
      };
    }
    
    // Verificar si hay suficientes puntos en caso de ajuste negativo
    if (pointsToAdd < 0 && Math.abs(pointsToAdd) > (clientBusinessData.points || 0)) {
      throw new Error("El cliente no tiene suficientes puntos para realizar este ajuste.");
    }
    
    // Crear transacción
    await addDoc(collection(db, "transactions"), transactionData);
    
    // Actualizar puntos del cliente
    await updateDoc(doc(db, "client_businesses", clientBusinessDoc.id), {
      points: increment(pointsToAdd),
      updatedAt: serverTimestamp()
    });
    
    // Recargar datos
    await loadTransactions();
    
    alert("Transacción registrada exitosamente.");
    addTransactionModal.hide();
  } catch (error) {
    console.error("Error al registrar transacción:", error);
    alert("Error al registrar transacción: " + error.message);
  } finally {
    addingTransaction.value = false;
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
.transaction-list {
  padding-bottom: 2rem;
}
</style>
