<template>
  <div class="transaction-list">
    <h2 class="mb-4">Mis Transacciones</h2>
    
    <div class="card">
      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Historial de Transacciones</h5>
        <div class="d-flex">
          <select v-model="businessFilter" class="form-select form-select-sm me-2">
            <option value="">Todos los negocios</option>
            <option v-for="business in businesses" :key="business.businessId" :value="business.businessId">
              {{ business.businessName }}
            </option>
          </select>
          <select v-model="typeFilter" class="form-select form-select-sm">
            <option value="">Todos los tipos</option>
            <option value="purchase">Compras</option>
            <option value="reward">Premios</option>
            <option value="adjustment">Ajustes</option>
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
            <h4 class="alert-heading">No hay transacciones</h4>
            <p>No se encontraron transacciones con los filtros seleccionados.</p>
          </div>
        </div>
        
        <div v-else>
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Negocio</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Puntos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="transaction in filteredTransactions" :key="transaction.id">
                  <td>{{ formatDate(transaction.timestamp) }}</td>
                  <td>{{ transaction.businessName }}</td>
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
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="d-flex justify-content-between align-items-center mt-4">
            <div>
              <span class="me-2">Mostrando {{ filteredTransactions.length }} de {{ transactions.length }} transacciones</span>
            </div>
            <div>
              <button 
                v-if="transactions.length > limit" 
                class="btn btn-primary" 
                @click="loadMore"
              >
                Cargar más
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card mt-4">
      <div class="card-header bg-success text-white">
        <h5 class="mb-0">Resumen de Puntos</h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div v-for="business in businesses" :key="business.businessId" class="col-md-4 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h5 class="card-title">{{ business.businessName }}</h5>
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-0">Puntos actuales:</p>
                    <h3 class="text-success">{{ business.points || 0 }}</h3>
                  </div>
                  <div>
                    <p class="mb-0">Nivel:</p>
                    <span class="badge bg-primary fs-6">{{ calculateLevel(business.points || 0) }}</span>
                  </div>
                </div>
                <div class="mt-3">
                  <router-link :to="`/client/business/${business.businessId}`" class="btn btn-sm btn-outline-primary">
                    Ver tarjeta
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { collection, query, where, orderBy, limit as firestoreLimit, getDocs, startAfter } from 'firebase/firestore';
import { db } from '@/firebase';

const authStore = useAuthStore();
const transactions = ref([]);
const businesses = ref([]);
const loading = ref(true);
const businessFilter = ref('');
const typeFilter = ref('');
const limit = ref(20);
const lastVisible = ref(null);

const filteredTransactions = computed(() => {
  return transactions.value.filter(transaction => {
    const matchesBusiness = !businessFilter.value || transaction.businessId === businessFilter.value;
    const matchesType = !typeFilter.value || transaction.type === typeFilter.value;
    return matchesBusiness && matchesType;
  });
});

onMounted(async () => {
  if (authStore.isAuthenticated && authStore.isBusinessClient) {
    await loadBusinesses();
    await loadTransactions();
  }
});

async function loadBusinesses() {
  businesses.value = authStore.clientBusinesses;
}

async function loadTransactions(isLoadMore = false) {
  loading.value = true;
  
  try {
    let transactionsQuery;
    
    if (isLoadMore && lastVisible.value) {
      transactionsQuery = query(
        collection(db, "transactions"),
        where("clientId", "==", authStore.user.uid),
        orderBy("timestamp", "desc"),
        startAfter(lastVisible.value),
        firestoreLimit(limit.value)
      );
    } else {
      transactionsQuery = query(
        collection(db, "transactions"),
        where("clientId", "==", authStore.user.uid),
        orderBy("timestamp", "desc"),
        firestoreLimit(limit.value)
      );
    }
    
    const snapshot = await getDocs(transactionsQuery);
    
    if (!snapshot.empty) {
      lastVisible.value = snapshot.docs[snapshot.docs.length - 1];
      
      const newTransactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (isLoadMore) {
        transactions.value = [...transactions.value, ...newTransactions];
      } else {
        transactions.value = newTransactions;
      }
    }
  } catch (error) {
    console.error("Error al cargar transacciones:", error);
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (lastVisible.value) {
    await loadTransactions(true);
  }
}

function calculateLevel(points) {
  if (points >= 1000) return "Platino";
  if (points >= 500) return "Oro";
  if (points >= 200) return "Plata";
  return "Bronce";
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
.transaction-list {
  padding-bottom: 2rem;
}
</style>
