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
  <td>{{ consumo.fecha }}</td>
  <td>{{ consumo.cliente }}</td>
  <td>
    <span class="badge bg-info">{{ consumo.tipo }}</span>
  </td>
  <td>{{ consumo.descripcion }}</td>
  <td>{{ consumo.monto }}</td>
  <td>{{ consumo.puntos }}</td>
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
    
    <!-- Aquí irían los modales y componentes adicionales si son necesarios -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { 
  collection, query, where, orderBy, getDocs, getDoc, doc,
  addDoc, updateDoc, serverTimestamp
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
const clientMap = ref({});

// Paginación
const pageSize = 10;
const currentPage = ref(1);
const totalPages = computed(() => Math.ceil(filteredConsumos.value.length / pageSize));
const paginatedConsumos = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredConsumos.value.slice(start, end);
});

// Para el modal de añadir consumo
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

import { nextTick } from 'vue';
onMounted(async () => {
  if (authStore.isAuthenticated && (authStore.isBusinessAdmin || authStore.isSuperAdmin)) {
    if (authStore.businessId) {
      await Promise.all([
        loadConsumos(),
        loadClients()
      ]);
      loading.value = false;
    }
    // Inicializar modales de Bootstrap solo después de montar el DOM
    await nextTick();
    if (window.bootstrap) {
      const detailsEl = document.getElementById('consumptionDetailsModal');
      const addEl = document.getElementById('addConsumptionModal');
      if (detailsEl) consumptionDetailsModal = new window.bootstrap.Modal(detailsEl);
      if (addEl) addConsumptionModal = new window.bootstrap.Modal(addEl);
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
    const consumosQuery = collection(db, "business_invoices", businessId.value, "purchases");
    const snapshot = await getDocs(consumosQuery);
    const consumosAdaptados = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const nombreCliente = clientMap.value[data.phoneNumber] || data.customerName || data.phoneNumber || '—';
      return {
        id: docSnap.id,
        fecha: data.date ? formatDate(data.date) : '—',
        cliente: nombreCliente,
        tipo: data.type || 'Ajuste',
        descripcion: data.invoiceNumber || data.description || '—',
        monto: data.amount !== undefined ? `$${data.amount}` : '—',
        puntos: data.points !== undefined ? data.points : '—',
      };
    });
    consumos.value = consumosAdaptados;
    filterConsumos();
  } catch (error) {
    console.error("Error al cargar consumos:", error);
  }
}

async function loadClients() {
  try {
    const clientsQuery = collection(db, "business_customers", businessId.value, "customers");
    const clientsSnapshot = await getDocs(clientsQuery);
    clients.value = clientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Crear mapa para acceso rápido por phoneNumber
    clientMap.value = {};
    clients.value.forEach(client => {
      clientMap.value[client.phoneNumber] = client.name;
    });
  } catch (error) {
    console.error("Error al cargar clientes:", error);
  }
}

function filterConsumos() {
  let filtered = [...consumos.value];
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    filtered = filtered.filter(consumo => 
      (consumo.clientEmail && consumo.clientEmail.toLowerCase().includes(term)) ||
      (consumo.clientName && consumo.clientName.toLowerCase().includes(term)) ||
      (consumo.clientId && consumo.clientId.toLowerCase().includes(term)) ||
      (consumo.description && consumo.description.toLowerCase().includes(term))
    );
  }
  if (typeFilter.value) {
    filtered = filtered.filter(consumo => consumo.type === typeFilter.value);
  }
  // Filtrar por fecha (opcional, igual que antes)
  filteredConsumos.value = filtered;
}

async function viewConsumptionDetails(consumo) {
  selectedConsumption.value = consumo;
  await loadClientInfo(consumo.clientId);
  if (consumo.type === 'reward' && consumo.rewardId) {
    await loadRewardInfo(consumo.rewardId);
  } else {
    rewardInfo.value = null;
  }
  if (consumptionDetailsModal) consumptionDetailsModal.show();
}

async function loadClientInfo(clientId) {
  try {
    const clientDoc = await getDoc(doc(db, "business_customers", businessId.value, "customers", clientId));
    if (clientDoc.exists()) {
      clientInfo.value = clientDoc.data();
    } else {
      clientInfo.value = null;
    }
  } catch (error) {
    clientInfo.value = null;
  }
}

async function loadRewardInfo(rewardId) {
  // Implementa la carga de información de premios si aplica
  rewardInfo.value = null;
}

function showAddConsumptionModal() {
  newConsumption.value = {
    type: 'purchase',
    clientId: '',
    amount: 0,
    points: 0,
    description: ''
  };
  if (addConsumptionModal) addConsumptionModal.show();
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
    const businessDoc = await getDoc(doc(db, "businesses", businessId.value));
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
    await addDoc(collection(db, "transactions"), consumoData);
    await loadConsumos();
    alert("Transacción registrada exitosamente.");
    if (addConsumptionModal) addConsumptionModal.hide();
  } catch (error) {
    console.error("Error al registrar transacción:", error);
    alert("Error al registrar transacción: " + error.message);
  } finally {
    addingConsumption.value = false;
  }
}

function formatDate(date) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}
</script>

<style scoped>
.consumption-list {
  padding-bottom: 2rem;
}
</style>
