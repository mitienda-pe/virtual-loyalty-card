<template>
  <div class="consumption-list">
    <h2 class="mb-4">Mis Consumos</h2>
    
    <div class="card">
      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Historial de Consumos</h5>
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
          <p class="mt-2">Cargando consumos...</p>
        </div>
        
        <div v-else-if="filteredConsumos.length === 0" class="text-center py-5">
          <div class="alert alert-info" role="alert">
            <h4 class="alert-heading">No hay consumos</h4>
            <p>No se encontraron consumos con los filtros seleccionados.</p>
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
                <tr v-for="consumo in filteredConsumos" :key="consumo.id">
                  <td>{{ formatDate(consumo.timestamp) }}</td>
                  <td>{{ consumo.businessName }}</td>
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
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="d-flex justify-content-between align-items-center mt-4">
            <div>
              <span class="me-2">Mostrando {{ filteredConsumos.length }} de {{ consumos.length }} consumos</span>
            </div>
            <div>
              <button 
                v-if="consumos.length > limit" 
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
const consumos = ref([]);
const businesses = ref([]);
const loading = ref(true);
const businessFilter = ref('');
const typeFilter = ref('');
const limit = ref(20);
const lastVisible = ref(null);

const filteredConsumos = computed(() => {
  return consumos.value.filter(consumo => {
    const matchesBusiness = !businessFilter.value || consumo.businessId === businessFilter.value;
    const matchesType = !typeFilter.value || consumo.type === typeFilter.value;
    return matchesBusiness && matchesType;
  });
});

onMounted(async () => {
  if (authStore.isAuthenticated && authStore.isBusinessClient) {
    await loadBusinesses();
    await loadConsumos();
  }
});

async function loadBusinesses() {
  businesses.value = authStore.clientBusinesses;
}

async function loadConsumos(isLoadMore = false) {
  loading.value = true;
  
  try {
    let consumosQuery;
    
    if (isLoadMore && lastVisible.value) {
      consumosQuery = query(
        collection(db, "transactions"),
        where("clientId", "==", authStore.user.uid),
        orderBy("timestamp", "desc"),
        startAfter(lastVisible.value),
        firestoreLimit(limit.value)
      );
    } else {
      consumosQuery = query(
        collection(db, "transactions"),
        where("clientId", "==", authStore.user.uid),
        orderBy("timestamp", "desc"),
        firestoreLimit(limit.value)
      );
    }
    
    const snapshot = await getDocs(consumosQuery);
    
    if (!snapshot.empty) {
      lastVisible.value = snapshot.docs[snapshot.docs.length - 1];
      
      const newConsumos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (isLoadMore) {
        consumos.value = [...consumos.value, ...newConsumos];
      } else {
        consumos.value = newConsumos;
      }
    }
  } catch (error) {
    console.error("Error al cargar consumos:", error);
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  if (lastVisible.value) {
    loadConsumos(true);
  }
}

function formatDate(date) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

function calculateLevel(points) {
  if (points >= 1000) return 'Oro';
  if (points >= 500) return 'Plata';
  return 'Bronce';
}
</script>

<style scoped>
.consumption-list {
  padding-bottom: 2rem;
}
</style>
