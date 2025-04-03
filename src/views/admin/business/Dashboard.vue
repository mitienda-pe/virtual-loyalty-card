<template>
  <div class="business-admin-dashboard">
    <h2 class="mb-4">Dashboard de Administrador</h2>
    
    <div class="row">
      <div class="col-md-4 mb-4">
        <div class="card bg-primary text-white h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h5 class="card-title">Total de Clientes</h5>
                <h2 class="display-4">{{ stats.totalClients }}</h2>
              </div>
              <i class="bi bi-people fs-1"></i>
            </div>
            <p class="card-text mt-2">
              <span class="badge bg-light text-primary">
                <i class="bi bi-arrow-up"></i> {{ stats.newClientsThisMonth }} nuevos este mes
              </span>
            </p>
          </div>
          <div class="card-footer bg-transparent border-0">
            <router-link to="/admin/business/clients" class="text-white">Ver todos los clientes <i class="bi bi-arrow-right"></i></router-link>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-4">
        <div class="card bg-success text-white h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h5 class="card-title">Transacciones</h5>
                <h2 class="display-4">{{ stats.totalTransactions }}</h2>
              </div>
              <i class="bi bi-cash-stack fs-1"></i>
            </div>
            <p class="card-text mt-2">
              <span class="badge bg-light text-success">
                <i class="bi bi-arrow-up"></i> {{ stats.transactionsThisMonth }} este mes
              </span>
            </p>
          </div>
          <div class="card-footer bg-transparent border-0">
            <router-link to="/admin/business/transactions" class="text-white">Ver todas las transacciones <i class="bi bi-arrow-right"></i></router-link>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-4">
        <div class="card bg-info text-white h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h5 class="card-title">Premios Canjeados</h5>
                <h2 class="display-4">{{ stats.totalRewards }}</h2>
              </div>
              <i class="bi bi-gift fs-1"></i>
            </div>
            <p class="card-text mt-2">
              <span class="badge bg-light text-info">
                <i class="bi bi-arrow-up"></i> {{ stats.rewardsThisMonth }} este mes
              </span>
            </p>
          </div>
          <div class="card-footer bg-transparent border-0">
            <router-link to="/admin/business/rewards" class="text-white">Gestionar premios <i class="bi bi-arrow-right"></i></router-link>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row">
      <div class="col-md-8 mb-4">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h5 class="card-title mb-0">Actividad Reciente</h5>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            
            <div v-else-if="recentTransactions.length === 0" class="text-center py-4">
              <p class="text-muted">No hay transacciones recientes.</p>
            </div>
            
            <div v-else class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="transaction in recentTransactions" :key="transaction.id">
                    <td>{{ formatDate(transaction.timestamp) }}</td>
                    <td>{{ transaction.clientEmail || transaction.clientId }}</td>
                    <td>
                      <span :class="`badge ${transaction.type === 'purchase' ? 'bg-primary' : transaction.type === 'reward' ? 'bg-success' : 'bg-info'}`">
                        {{ transaction.type === 'purchase' ? 'Compra' : transaction.type === 'reward' ? 'Premio' : 'Ajuste' }}
                      </span>
                    </td>
                    <td>{{ transaction.description }}</td>
                    <td>
                      <span :class="transaction.points >= 0 ? 'text-success' : 'text-danger'">
                        {{ transaction.points >= 0 ? '+' : '' }}{{ transaction.points }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="mt-3 text-end">
              <router-link to="/admin/business/transactions" class="btn btn-primary">
                Ver todas las transacciones
              </router-link>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-4">
        <div class="card">
          <div class="card-header bg-success text-white">
            <h5 class="card-title mb-0">Premios Populares</h5>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-center py-4">
              <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            
            <div v-else-if="popularRewards.length === 0" class="text-center py-4">
              <p class="text-muted">No hay datos de premios disponibles.</p>
            </div>
            
            <div v-else>
              <ul class="list-group">
                <li v-for="reward in popularRewards" :key="reward.id" class="list-group-item d-flex justify-content-between align-items-center">
                  {{ reward.name }}
                  <span class="badge bg-primary rounded-pill">{{ reward.redeemCount }} canjes</span>
                </li>
              </ul>
              
              <div class="mt-3 text-end">
                <router-link to="/admin/business/rewards" class="btn btn-success">
                  Gestionar premios
                </router-link>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card mt-4">
          <div class="card-header bg-info text-white">
            <h5 class="card-title mb-0">Acciones Rápidas</h5>
          </div>
          <div class="card-body">
            <div class="d-grid gap-2">
              <button class="btn btn-primary" @click="showRegisterClientModal">
                <i class="bi bi-person-plus"></i> Registrar Nuevo Cliente
              </button>
              <button class="btn btn-success" @click="showAddTransactionModal">
                <i class="bi bi-cash"></i> Registrar Compra
              </button>
              <router-link to="/admin/business/rewards/new" class="btn btn-info">
                <i class="bi bi-gift"></i> Crear Nuevo Premio
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para registrar cliente -->
    <div class="modal fade" id="registerClientModal" tabindex="-1" aria-labelledby="registerClientModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="registerClientModalLabel">Registrar Nuevo Cliente</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="registerClient">
              <div class="mb-3">
                <label for="clientEmail" class="form-label">Email del Cliente</label>
                <input type="email" class="form-control" id="clientEmail" v-model="newClient.email" required>
              </div>
              <div class="mb-3">
                <label for="clientPhone" class="form-label">Teléfono del Cliente</label>
                <input type="tel" class="form-control" id="clientPhone" v-model="newClient.phone" required>
              </div>
              <div class="mb-3">
                <label for="clientName" class="form-label">Nombre del Cliente</label>
                <input type="text" class="form-control" id="clientName" v-model="newClient.name">
              </div>
              <div class="d-grid">
                <button type="submit" class="btn btn-primary" :disabled="registeringClient">
                  <span v-if="registeringClient" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Registrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para añadir transacción -->
    <div class="modal fade" id="addTransactionModal" tabindex="-1" aria-labelledby="addTransactionModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title" id="addTransactionModalLabel">Registrar Compra</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="addTransaction">
              <div class="mb-3">
                <label for="clientSelect" class="form-label">Cliente</label>
                <select class="form-select" id="clientSelect" v-model="newTransaction.clientId" required>
                  <option value="" disabled selected>Seleccionar cliente</option>
                  <option v-for="client in clients" :key="client.id" :value="client.id">
                    {{ client.email || client.phone || client.id }}
                  </option>
                </select>
              </div>
              <div class="mb-3">
                <label for="transactionAmount" class="form-label">Monto de la Compra ($)</label>
                <input type="number" class="form-control" id="transactionAmount" v-model.number="newTransaction.amount" min="0" step="0.01" required>
              </div>
              <div class="mb-3">
                <label for="transactionDescription" class="form-label">Descripción (opcional)</label>
                <input type="text" class="form-control" id="transactionDescription" v-model="newTransaction.description">
              </div>
              <div class="d-grid">
                <button type="submit" class="btn btn-success" :disabled="addingTransaction">
                  <span v-if="addingTransaction" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { 
  collection, query, where, orderBy, limit, getDocs, getDoc, doc,
  addDoc, updateDoc, serverTimestamp, Timestamp, increment
} from 'firebase/firestore';
import { db } from '@/firebase';

const authStore = useAuthStore();
const loading = ref(true);
const stats = ref({
  totalClients: 0,
  newClientsThisMonth: 0,
  totalTransactions: 0,
  transactionsThisMonth: 0,
  totalRewards: 0,
  rewardsThisMonth: 0
});
const recentTransactions = ref([]);
const popularRewards = ref([]);
const clients = ref([]);

// Para el modal de registro de cliente
const newClient = ref({
  email: '',
  phone: '',
  name: ''
});
const registeringClient = ref(false);
let registerClientModalInstance = null;

// Para el modal de transacción
const newTransaction = ref({
  clientId: '',
  amount: 0,
  description: ''
});
const addingTransaction = ref(false);
let addTransactionModalInstance = null;

const businessId = computed(() => authStore.businessId);

onMounted(async () => {
  if (authStore.isAuthenticated && (authStore.isBusinessAdmin || authStore.isSuperAdmin)) {
    // Inicializar modales de Bootstrap
    registerClientModalInstance = new bootstrap.Modal(document.getElementById('registerClientModal'));
    addTransactionModalInstance = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    
    // Cargar datos
    await Promise.all([
      loadStats(),
      loadRecentTransactions(),
      loadPopularRewards(),
      loadClients()
    ]);
    
    loading.value = false;
  }
});

async function loadStats() {
  try {
    // Obtener el primer día del mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfMonthTimestamp = Timestamp.fromDate(firstDayOfMonth);
    
    // Contar clientes
    const clientsQuery = query(
      collection(db, "client_businesses"),
      where("businessId", "==", businessId.value)
    );
    const clientsSnapshot = await getDocs(clientsQuery);
    stats.value.totalClients = clientsSnapshot.size;
    
    // Contar nuevos clientes este mes
    const newClientsQuery = query(
      collection(db, "client_businesses"),
      where("businessId", "==", businessId.value),
      where("createdAt", ">=", firstDayOfMonthTimestamp)
    );
    const newClientsSnapshot = await getDocs(newClientsQuery);
    stats.value.newClientsThisMonth = newClientsSnapshot.size;
    
    // Contar transacciones
    const transactionsQuery = query(
      collection(db, "transactions"),
      where("businessId", "==", businessId.value)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    stats.value.totalTransactions = transactionsSnapshot.size;
    
    // Contar transacciones este mes
    const transactionsThisMonthQuery = query(
      collection(db, "transactions"),
      where("businessId", "==", businessId.value),
      where("timestamp", ">=", firstDayOfMonthTimestamp)
    );
    const transactionsThisMonthSnapshot = await getDocs(transactionsThisMonthQuery);
    stats.value.transactionsThisMonth = transactionsThisMonthSnapshot.size;
    
    // Contar premios canjeados
    const rewardsQuery = query(
      collection(db, "client_rewards"),
      where("businessId", "==", businessId.value),
      where("redeemed", "==", true)
    );
    const rewardsSnapshot = await getDocs(rewardsQuery);
    stats.value.totalRewards = rewardsSnapshot.size;
    
    // Contar premios canjeados este mes
    const rewardsThisMonthQuery = query(
      collection(db, "client_rewards"),
      where("businessId", "==", businessId.value),
      where("redeemed", "==", true),
      where("redeemedAt", ">=", firstDayOfMonthTimestamp)
    );
    const rewardsThisMonthSnapshot = await getDocs(rewardsThisMonthQuery);
    stats.value.rewardsThisMonth = rewardsThisMonthSnapshot.size;
  } catch (error) {
    console.error("Error al cargar estadísticas:", error);
  }
}

async function loadRecentTransactions() {
  try {
    const transactionsQuery = query(
      collection(db, "transactions"),
      where("businessId", "==", businessId.value),
      orderBy("timestamp", "desc"),
      limit(10)
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
        }
      } catch (error) {
        console.error("Error al obtener datos del cliente:", error);
      }
      
      return transaction;
    }));
    
    recentTransactions.value = transactionsWithClientInfo;
  } catch (error) {
    console.error("Error al cargar transacciones recientes:", error);
  }
}

async function loadPopularRewards() {
  try {
    // Obtener todos los premios del negocio
    const rewardsQuery = query(
      collection(db, "rewards"),
      where("businessId", "==", businessId.value)
    );
    
    const rewardsSnapshot = await getDocs(rewardsQuery);
    const rewardsData = rewardsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      redeemCount: 0 // Inicializar contador de canjes
    }));
    
    // Contar canjes para cada premio
    const clientRewardsQuery = query(
      collection(db, "client_rewards"),
      where("businessId", "==", businessId.value),
      where("redeemed", "==", true)
    );
    
    const clientRewardsSnapshot = await getDocs(clientRewardsQuery);
    
    // Contar canjes por premio
    clientRewardsSnapshot.forEach(doc => {
      const data = doc.data();
      const reward = rewardsData.find(r => r.id === data.rewardId);
      if (reward) {
        reward.redeemCount++;
      }
    });
    
    // Ordenar por número de canjes y tomar los 5 más populares
    popularRewards.value = rewardsData
      .sort((a, b) => b.redeemCount - a.redeemCount)
      .slice(0, 5);
  } catch (error) {
    console.error("Error al cargar premios populares:", error);
  }
}

async function loadClients() {
  try {
    const clientsQuery = query(
      collection(db, "client_businesses"),
      where("businessId", "==", businessId.value)
    );
    
    const clientsSnapshot = await getDocs(clientsQuery);
    
    // Obtener información adicional de cada cliente
    const clientsData = await Promise.all(clientsSnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      
      try {
        const userDoc = await getDoc(doc(db, "users", data.clientId));
        if (userDoc.exists()) {
          return {
            id: data.clientId,
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
        id: data.clientId,
        points: data.points || 0,
        ...data
      };
    }));
    
    clients.value = clientsData;
  } catch (error) {
    console.error("Error al cargar clientes:", error);
  }
}

function showRegisterClientModal() {
  newClient.value = {
    email: '',
    phone: '',
    name: ''
  };
  registerClientModalInstance.show();
}

function showAddTransactionModal() {
  newTransaction.value = {
    clientId: '',
    amount: 0,
    description: ''
  };
  addTransactionModalInstance.show();
}

async function registerClient() {
  if (!newClient.value.email && !newClient.value.phone) {
    alert("Debes proporcionar al menos un email o teléfono para el cliente.");
    return;
  }
  
  registeringClient.value = true;
  
  try {
    // Aquí iría la lógica para crear un nuevo usuario en Firebase Auth
    // y luego asociarlo con el negocio
    
    // Por ahora, simularemos que ya existe el usuario y solo lo asociaremos al negocio
    const clientId = "user_" + Date.now(); // Simulado, en realidad sería el UID del usuario
    
    // Crear relación cliente-negocio
    await addDoc(collection(db, "client_businesses"), {
      clientId: clientId,
      businessId: businessId.value,
      points: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Recargar clientes
    await loadClients();
    await loadStats();
    
    alert("Cliente registrado exitosamente.");
    registerClientModalInstance.hide();
  } catch (error) {
    console.error("Error al registrar cliente:", error);
    alert("Error al registrar cliente: " + error.message);
  } finally {
    registeringClient.value = false;
  }
}

async function addTransaction() {
  if (!newTransaction.value.clientId || newTransaction.value.amount <= 0) {
    alert("Por favor, selecciona un cliente y especifica un monto válido.");
    return;
  }
  
  addingTransaction.value = true;
  
  try {
    const businessDoc = await getDoc(doc(db, "businesses", businessId.value));
    if (!businessDoc.exists()) {
      throw new Error("No se encontró información del negocio.");
    }
    
    const businessData = businessDoc.data();
    const pointsPerCurrency = businessData.pointsPerCurrency || 1; // Puntos por cada unidad de moneda
    const pointsEarned = Math.floor(newTransaction.value.amount * pointsPerCurrency);
    
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
    
    // Crear transacción
    await addDoc(collection(db, "transactions"), {
      clientId: newTransaction.value.clientId,
      businessId: businessId.value,
      businessName: businessData.name,
      type: "purchase",
      description: newTransaction.value.description || `Compra por $${newTransaction.value.amount}`,
      amount: newTransaction.value.amount,
      points: pointsEarned,
      timestamp: serverTimestamp()
    });
    
    // Actualizar puntos del cliente
    await updateDoc(doc(db, "client_businesses", clientBusinessDoc.id), {
      points: increment(pointsEarned),
      updatedAt: serverTimestamp()
    });
    
    // Recargar datos
    await Promise.all([
      loadRecentTransactions(),
      loadStats()
    ]);
    
    alert(`Transacción registrada exitosamente. El cliente ha ganado ${pointsEarned} puntos.`);
    addTransactionModalInstance.hide();
  } catch (error) {
    console.error("Error al registrar transacción:", error);
    alert("Error al registrar transacción: " + error.message);
  } finally {
    addingTransaction.value = false;
  }
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  
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
.business-admin-dashboard {
  padding-bottom: 2rem;
}
</style>
