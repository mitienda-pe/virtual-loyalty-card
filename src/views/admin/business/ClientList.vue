<template>
  <div class="client-list">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2>Clientes del Negocio</h2>
      <button class="btn btn-primary" @click="showAddClientModal">
        <i class="bi bi-person-plus"></i> Añadir Cliente
      </button>
    </div>
    
    <div class="card">
      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Lista de Clientes</h5>
        <div class="d-flex">
          <input 
            type="text" 
            class="form-control form-control-sm me-2" 
            placeholder="Buscar cliente..." 
            v-model="searchTerm"
            @input="filterClients"
          >
          <select v-model="sortBy" class="form-select form-select-sm" @change="sortClients">
            <option value="name">Nombre</option>
            <option value="email">Email</option>
            <option value="points">Puntos</option>
            <option value="joinDate">Fecha de registro</option>
          </select>
        </div>
      </div>
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">Cargando clientes...</p>
        </div>
        
        <div v-else-if="filteredClients.length === 0" class="text-center py-5">
          <div class="alert alert-info" role="alert">
            <h4 class="alert-heading">No se encontraron clientes</h4>
            <p>No hay clientes registrados en tu negocio o ninguno coincide con tu búsqueda.</p>
          </div>
        </div>
        
        <div v-else>
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Puntos</th>
                  <th>Nivel</th>
                  <th>Fecha de registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="client in filteredClients" :key="client.id">
                  <td>
                    <div class="d-flex align-items-center">
                      <div class="avatar-circle me-2">
                        {{ getInitials(client.name || client.email || 'Usuario') }}
                      </div>
                      <div>{{ client.name || 'Sin nombre' }}</div>
                    </div>
                  </td>
                  <td>{{ client.email || 'Sin email' }}</td>
                  <td>{{ client.phone || 'Sin teléfono' }}</td>
                  <td>{{ client.points || 0 }}</td>
                  <td>
                    <span :class="`badge ${getLevelBadgeClass(client.points || 0)}`">
                      {{ calculateLevel(client.points || 0) }}
                    </span>
                  </td>
                  <td>{{ formatDate(client.createdAt) }}</td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-sm btn-outline-primary" @click="viewClientDetails(client)">
                        <i class="bi bi-eye"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-success" @click="showAddPointsModal(client)">
                        <i class="bi bi-plus-circle"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger" @click="showRemovePointsModal(client)">
                        <i class="bi bi-dash-circle"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para ver detalles del cliente -->
    <div class="modal fade" id="clientDetailsModal" tabindex="-1" aria-labelledby="clientDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="clientDetailsModalLabel">Detalles del Cliente</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body pb-0 d-flex flex-row-reverse">
            <button class="btn btn-warning mb-2" @click="showRedeemRewardModal(selectedClient)">
              <i class="bi bi-gift"></i> Canjear Premio
            </button>
          </div>
          <div class="modal-body" v-if="selectedClient">
            <div class="row">
              <div class="col-md-6">
                <h5>Información del Cliente</h5>
                <p><strong>Nombre:</strong> {{ selectedClient.name || 'Sin nombre' }}</p>
                <p><strong>Email:</strong> {{ selectedClient.email || 'Sin email' }}</p>
                <p><strong>Teléfono:</strong> {{ selectedClient.phone || 'Sin teléfono' }}</p>
                <p><strong>Cliente desde:</strong> {{ formatDate(selectedClient.createdAt) }}</p>
                <p><strong>Última actualización:</strong> {{ formatDate(selectedClient.updatedAt) }}</p>
                <p><strong>Puntos acumulados:</strong> {{ selectedClient.points || 0 }}</p>
                <p><strong>Nivel:</strong> {{ calculateLevel(selectedClient.points || 0) }}</p>
              </div>
              <div class="col-md-6">
                <h5>Últimas Transacciones</h5>
                <div v-if="clientTransactions.length === 0" class="text-center py-3">
                  <p class="text-muted">No hay transacciones registradas.</p>
                </div>
                <div v-else class="table-responsive">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="transaction in clientTransactions" :key="transaction.id">
                        <td>{{ formatDate(transaction.timestamp) }}</td>
                        <td>
                          <span :class="`badge ${transaction.type === 'purchase' ? 'bg-primary' : transaction.type === 'reward' ? 'bg-success' : 'bg-info'}`">
                            {{ transaction.type === 'purchase' ? 'Compra' : transaction.type === 'reward' ? 'Premio' : 'Ajuste' }}
                          </span>
                        </td>
                        <td>
                          <span :class="transaction.points >= 0 ? 'text-success' : 'text-danger'">
                            {{ transaction.points >= 0 ? '+' : '' }}{{ transaction.points }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div class="mt-4">
              <h5>Premios Canjeados</h5>
              <div v-if="clientRewards.length === 0" class="text-center py-3">
                <p class="text-muted">No ha canjeado ningún premio.</p>
              </div>
              <div v-else class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Premio</th>
                      <th>Costo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="reward in clientRewards" :key="reward.id">
                      <td>{{ formatDate(reward.createdAt) }}</td>
                      <td>{{ reward.rewardName }}</td>
                      <td>{{ reward.pointsCost }} pts</td>
                      <td>
                        <span :class="`badge ${reward.redeemed ? 'bg-success' : 'bg-warning'}`">
                          {{ reward.redeemed ? 'Canjeado' : 'Pendiente' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para canjear premio -->
    <div class="modal fade" id="redeemRewardModal" tabindex="-1" aria-labelledby="redeemRewardModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-warning text-dark">
            <h5 class="modal-title" id="redeemRewardModalLabel">Canjear Premio</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="redeemRewardAction">
              <div class="mb-3">
                <label for="rewardName" class="form-label">Premio a canjear</label>
                <input type="text" class="form-control" id="rewardName" v-model="rewardToRedeem" placeholder="Ej: Café gratis" required>
              </div>
              <div class="mb-3">
                <label for="consumptionsNeeded" class="form-label">Consumos requeridos</label>
                <input type="number" class="form-control" id="consumptionsNeeded" v-model.number="consumptionsNeeded" min="1" required>
              </div>
              <div class="alert alert-info" v-if="redemptionMessage">{{ redemptionMessage }}</div>
              <div class="d-grid">
                <button type="submit" class="btn btn-warning" :disabled="redeemingReward">
                  <span v-if="redeemingReward" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Confirmar Canje
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para añadir cliente -->
    <div class="modal fade" id="addClientModal" tabindex="-1" aria-labelledby="addClientModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="addClientModalLabel">Añadir Nuevo Cliente</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="addClient">
              <div class="mb-3">
                <label for="newClientEmail" class="form-label">Email</label>
                <input type="email" class="form-control" id="newClientEmail" v-model="newClient.email" required>
              </div>
              <div class="mb-3">
                <label for="newClientPhone" class="form-label">Teléfono</label>
                <input type="tel" class="form-control" id="newClientPhone" v-model="newClient.phone">
              </div>
              <div class="mb-3">
                <label for="newClientName" class="form-label">Nombre</label>
                <input type="text" class="form-control" id="newClientName" v-model="newClient.name">
              </div>
              <div class="mb-3">
                <label for="newClientInitialPoints" class="form-label">Puntos Iniciales</label>
                <input type="number" class="form-control" id="newClientInitialPoints" v-model.number="newClient.initialPoints" min="0">
              </div>
              <div class="d-grid">
                <button type="submit" class="btn btn-primary" :disabled="addingClient">
                  <span v-if="addingClient" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Añadir Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para añadir puntos -->
    <div class="modal fade" id="addPointsModal" tabindex="-1" aria-labelledby="addPointsModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title" id="addPointsModalLabel">Añadir Puntos</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" v-if="selectedClient">
            <form @submit.prevent="addPoints">
              <div class="mb-3">
                <label for="clientInfo" class="form-label">Cliente</label>
                <input type="text" class="form-control" id="clientInfo" :value="selectedClient.name || selectedClient.email || selectedClient.phone" readonly>
              </div>
              <div class="mb-3">
                <label for="pointsToAdd" class="form-label">Puntos a Añadir</label>
                <input type="number" class="form-control" id="pointsToAdd" v-model.number="pointsToAdd" min="1" required>
              </div>
              <div class="mb-3">
                <label for="pointsReason" class="form-label">Motivo</label>
                <input type="text" class="form-control" id="pointsReason" v-model="pointsReason" placeholder="Ej: Compra, Promoción, etc.">
              </div>
              <div class="d-grid">
                <button type="submit" class="btn btn-success" :disabled="processingPoints">
                  <span v-if="processingPoints" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Añadir Puntos
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para restar puntos -->
    <div class="modal fade" id="removePointsModal" tabindex="-1" aria-labelledby="removePointsModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title" id="removePointsModalLabel">Restar Puntos</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" v-if="selectedClient">
            <form @submit.prevent="removePoints">
              <div class="mb-3">
                <label for="clientInfoRemove" class="form-label">Cliente</label>
                <input type="text" class="form-control" id="clientInfoRemove" :value="selectedClient.name || selectedClient.email || selectedClient.phone" readonly>
              </div>
              <div class="mb-3">
                <label for="pointsToRemove" class="form-label">Puntos a Restar</label>
                <input type="number" class="form-control" id="pointsToRemove" v-model.number="pointsToRemove" min="1" :max="selectedClient.points || 0" required>
              </div>
              <div class="mb-3">
                <label for="removeReason" class="form-label">Motivo</label>
                <input type="text" class="form-control" id="removeReason" v-model="removeReason" placeholder="Ej: Canje de premio, Ajuste, etc.">
              </div>
              <div class="d-grid">
                <button type="submit" class="btn btn-danger" :disabled="processingPoints">
                  <span v-if="processingPoints" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Restar Puntos
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
// Import your backend redeemReward function (adjust path as needed)
// import { redeemReward } from '@/api/redemption';

// Modal state for reward redemption
const redeemRewardModal = ref(null);
const rewardToRedeem = ref('');
const consumptionsNeeded = ref(10); // Default value, adjust as needed
const redeemingReward = ref(false);
const redemptionMessage = ref('');
let redeemingClient = ref(null);

function showRedeemRewardModal(client) {
  redeemingClient.value = client;
  rewardToRedeem.value = '';
  consumptionsNeeded.value = 10;
  redemptionMessage.value = '';
  if (!redeemRewardModal.value) {
    redeemRewardModal.value = new bootstrap.Modal(document.getElementById('redeemRewardModal'));
  }
  redeemRewardModal.value.show();
}

async function redeemRewardAction() {
  if (!redeemingClient.value || !rewardToRedeem.value) return;
  redeemingReward.value = true;
  redemptionMessage.value = '';
  try {
    // Real backend call
    const payload = {
      businessSlug: businessId.value,
      phoneNumber: redeemingClient.value.phone,
      reward: rewardToRedeem.value,
      consumptionsNeeded: consumptionsNeeded.value,
      approvedBy: authStore.user?.displayName || 'Admin',
      customerName: redeemingClient.value.name
    };
    const res = await fetch('/api/redeemReward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      redemptionMessage.value = '¡Premio canjeado exitosamente!';
      // Refresh client rewards/transactions
      await loadClientRewards(redeemingClient.value.id);
      setTimeout(() => {
        redeemRewardModal.value.hide();
      }, 1200);
    } else {
      redemptionMessage.value = result.message || 'No se pudo canjear el premio.';
    }
  } catch (e) {
    redemptionMessage.value = e.message || 'Error al canjear premio.';
  } finally {
    redeemingReward.value = false;
  }
}


import { 
  collection, query, where, orderBy, getDocs, getDoc, doc,
  addDoc, updateDoc, serverTimestamp, increment, limit
} from 'firebase/firestore';
import { db } from '@/firebase';

const authStore = useAuthStore();
const clients = ref([]);
const filteredClients = ref([]);
const loading = ref(true);
const searchTerm = ref('');
const sortBy = ref('name');
const selectedClient = ref(null);
const clientTransactions = ref([]);
const clientRewards = ref([]);

// Para el modal de añadir cliente
const newClient = ref({
  email: '',
  phone: '',
  name: '',
  initialPoints: 0
});
const addingClient = ref(false);

// Para los modales de puntos
const pointsToAdd = ref(0);
const pointsReason = ref('');
const pointsToRemove = ref(0);
const removeReason = ref('');
const processingPoints = ref(false);

// Referencias a los modales de Bootstrap
let clientDetailsModal = null;
let addClientModal = null;
let addPointsModal = null;
let removePointsModal = null;

const businessId = computed(() => authStore.businessId);

onMounted(async () => {
  if (authStore.isAuthenticated && (authStore.isBusinessAdmin || authStore.isSuperAdmin)) {
    // Inicializar modales de Bootstrap
    clientDetailsModal = new bootstrap.Modal(document.getElementById('clientDetailsModal'));
    addClientModal = new bootstrap.Modal(document.getElementById('addClientModal'));
    addPointsModal = new bootstrap.Modal(document.getElementById('addPointsModal'));
    removePointsModal = new bootstrap.Modal(document.getElementById('removePointsModal'));
    
    await loadClients();
    loading.value = false;
  }
});

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
            id: docSnap.id,
            clientId: data.clientId,
            email: userDoc.data().email,
            phone: userDoc.data().phone,
            name: userDoc.data().displayName,
            points: data.points || 0,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
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
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        ...data
      };
    }));
    
    clients.value = clientsData;
    filteredClients.value = [...clientsData];
    sortClients();
  } catch (error) {
    console.error("Error al cargar clientes:", error);
  }
}

function filterClients() {
  if (!searchTerm.value) {
    filteredClients.value = [...clients.value];
  } else {
    const term = searchTerm.value.toLowerCase();
    filteredClients.value = clients.value.filter(client => 
      (client.name && client.name.toLowerCase().includes(term)) ||
      (client.email && client.email.toLowerCase().includes(term)) ||
      (client.phone && client.phone.toLowerCase().includes(term))
    );
  }
  sortClients();
}

function sortClients() {
  switch (sortBy.value) {
    case 'name':
      filteredClients.value.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      break;
    case 'email':
      filteredClients.value.sort((a, b) => {
        const emailA = (a.email || '').toLowerCase();
        const emailB = (b.email || '').toLowerCase();
        return emailA.localeCompare(emailB);
      });
      break;
    case 'points':
      filteredClients.value.sort((a, b) => (b.points || 0) - (a.points || 0));
      break;
    case 'joinDate':
      filteredClients.value.sort((a, b) => {
        const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
        const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
        return dateB - dateA;
      });
      break;
  }
}

async function viewClientDetails(client) {
  selectedClient.value = client;
  
  // Cargar transacciones del cliente
  await loadClientTransactions(client.clientId);
  
  // Cargar premios del cliente
  await loadClientRewards(client.clientId);
  
  clientDetailsModal.show();
}

async function loadClientTransactions(clientId) {
  try {
    const transactionsQuery = query(
      collection(db, "transactions"),
      where("clientId", "==", clientId),
      where("businessId", "==", businessId.value),
      orderBy("timestamp", "desc"),
      limit(5)
    );
    
    const snapshot = await getDocs(transactionsQuery);
    clientTransactions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error al cargar transacciones del cliente:", error);
    clientTransactions.value = [];
  }
}

async function loadClientRewards(clientId) {
  try {
    // Fetch from business_redemptions/{businessSlug}/redemptions where phoneNumber == client phone
    const businessSlug = businessId.value;
    const client = clients.value.find(c => c.id === clientId);
    const phoneNumber = client?.phone || clientId;
    const redemptionsQuery = query(
      collection(db, `business_redemptions/${businessSlug}/redemptions`),
      where("phoneNumber", "==", phoneNumber),
      orderBy("date", "desc"),
      limit(5)
    );
    const snapshot = await getDocs(redemptionsQuery);
    clientRewards.value = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        createdAt: data.date?.toDate ? data.date.toDate() : (data.date || null),
        rewardName: data.reward || '',
        pointsCost: data.consumptionsUsed ? data.consumptionsUsed.length : data.consumptionsNeeded || '',
        redeemed: data.status === 'approved',
        ...data
      };
    });
  } catch (error) {
    console.error("Error al cargar premios del cliente:", error);
    clientRewards.value = [];
  }
}


function showAddClientModal() {
  newClient.value = {
    email: '',
    phone: '',
    name: '',
    initialPoints: 0
  };
  addClientModal.show();
}

async function addClient() {
  if (!newClient.value.email && !newClient.value.phone) {
    alert("Debes proporcionar al menos un email o teléfono para el cliente.");
    return;
  }
  
  addingClient.value = true;
  
  try {
    // Aquí iría la lógica para crear un nuevo usuario en Firebase Auth
    // y luego asociarlo con el negocio
    
    // Por ahora, simularemos que ya existe el usuario y solo lo asociaremos al negocio
    const clientId = "user_" + Date.now(); // Simulado, en realidad sería el UID del usuario
    
    // Crear relación cliente-negocio
    await addDoc(collection(db, "client_businesses"), {
      clientId: clientId,
      businessId: businessId.value,
      points: newClient.value.initialPoints || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Si se asignaron puntos iniciales, crear una transacción
    if (newClient.value.initialPoints > 0) {
      const businessDoc = await getDoc(doc(db, "businesses", businessId.value));
      const businessName = businessDoc.exists() ? businessDoc.data().name : "Negocio";
      
      await addDoc(collection(db, "transactions"), {
        clientId: clientId,
        businessId: businessId.value,
        businessName: businessName,
        type: "adjustment",
        description: "Puntos iniciales",
        points: newClient.value.initialPoints,
        timestamp: serverTimestamp()
      });
    }
    
    // Recargar clientes
    await loadClients();
    
    alert("Cliente añadido exitosamente.");
    addClientModal.hide();
  } catch (error) {
    console.error("Error al añadir cliente:", error);
    alert("Error al añadir cliente: " + error.message);
  } finally {
    addingClient.value = false;
  }
}

function showAddPointsModal(client) {
  selectedClient.value = client;
  pointsToAdd.value = 0;
  pointsReason.value = '';
  addPointsModal.show();
}

async function addPoints() {
  if (!selectedClient.value || pointsToAdd.value <= 0) {
    alert("Por favor, especifica una cantidad válida de puntos.");
    return;
  }
  
  processingPoints.value = true;
  
  try {
    // Actualizar puntos del cliente
    await updateDoc(doc(db, "client_businesses", selectedClient.value.id), {
      points: increment(pointsToAdd.value),
      updatedAt: serverTimestamp()
    });
    
    // Crear transacción
    const businessDoc = await getDoc(doc(db, "businesses", businessId.value));
    const businessName = businessDoc.exists() ? businessDoc.data().name : "Negocio";
    
    await addDoc(collection(db, "transactions"), {
      clientId: selectedClient.value.clientId,
      businessId: businessId.value,
      businessName: businessName,
      type: "adjustment",
      description: pointsReason || "Ajuste manual de puntos",
      points: pointsToAdd.value,
      timestamp: serverTimestamp()
    });
    
    // Actualizar cliente en la lista
    selectedClient.value.points = (selectedClient.value.points || 0) + pointsToAdd.value;
    
    alert(`Se han añadido ${pointsToAdd.value} puntos al cliente.`);
    addPointsModal.hide();
    
    // Recargar clientes para actualizar la lista
    await loadClients();
  } catch (error) {
    console.error("Error al añadir puntos:", error);
    alert("Error al añadir puntos: " + error.message);
  } finally {
    processingPoints.value = false;
  }
}

function showRemovePointsModal(client) {
  selectedClient.value = client;
  pointsToRemove.value = 0;
  removeReason.value = '';
  removePointsModal.show();
}

async function removePoints() {
  if (!selectedClient.value || pointsToRemove.value <= 0 || pointsToRemove.value > (selectedClient.value.points || 0)) {
    alert("Por favor, especifica una cantidad válida de puntos a restar.");
    return;
  }
  
  processingPoints.value = true;
  
  try {
    // Actualizar puntos del cliente
    await updateDoc(doc(db, "client_businesses", selectedClient.value.id), {
      points: increment(-pointsToRemove.value),
      updatedAt: serverTimestamp()
    });
    
    // Crear transacción
    const businessDoc = await getDoc(doc(db, "businesses", businessId.value));
    const businessName = businessDoc.exists() ? businessDoc.data().name : "Negocio";
    
    await addDoc(collection(db, "transactions"), {
      clientId: selectedClient.value.clientId,
      businessId: businessId.value,
      businessName: businessName,
      type: "adjustment",
      description: removeReason || "Ajuste manual de puntos",
      points: -pointsToRemove.value,
      timestamp: serverTimestamp()
    });
    
    // Actualizar cliente en la lista
    selectedClient.value.points = (selectedClient.value.points || 0) - pointsToRemove.value;
    
    alert(`Se han restado ${pointsToRemove.value} puntos al cliente.`);
    removePointsModal.hide();
    
    // Recargar clientes para actualizar la lista
    await loadClients();
  } catch (error) {
    console.error("Error al restar puntos:", error);
    alert("Error al restar puntos: " + error.message);
  } finally {
    processingPoints.value = false;
  }
}

function calculateLevel(points) {
  if (points >= 1000) return "Platino";
  if (points >= 500) return "Oro";
  if (points >= 200) return "Plata";
  return "Bronce";
}

function getLevelBadgeClass(points) {
  if (points >= 1000) return "bg-dark";
  if (points >= 500) return "bg-warning text-dark";
  if (points >= 200) return "bg-secondary";
  return "bg-light text-dark";
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
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
.client-list {
  padding-bottom: 2rem;
}

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #6c757d;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}
</style>
