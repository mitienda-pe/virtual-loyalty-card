<template>
  <div class="client-dashboard">
    <h2 class="mb-4">Mi Dashboard</h2>
    
    <div class="row">
      <div class="col-md-6 mb-4">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h5 class="card-title mb-0">Mis Negocios</h5>
          </div>
          <div class="card-body">
            <div v-if="clientBusinesses.length === 0" class="text-center py-4">
              <p class="text-muted">No estás registrado en ningún negocio todavía.</p>
            </div>
            <div v-else>
              <ul class="list-group">
                <li v-for="business in clientBusinesses" :key="business.businessId" class="list-group-item d-flex justify-content-between align-items-center">
                  {{ business.businessName }}
                  <router-link :to="`/client/business/${business.businessId}`" class="btn btn-sm btn-outline-primary">
                    Ver detalles
                  </router-link>
                </li>
              </ul>
            </div>
            <div class="mt-3">
              <router-link to="/client/businesses" class="btn btn-primary">Ver todos mis negocios</router-link>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-6 mb-4">
        <div class="card">
          <div class="card-header bg-success text-white">
            <h5 class="card-title mb-0">Mis Premios Disponibles</h5>
          </div>
          <div class="card-body">
            <div v-if="rewards.length === 0" class="text-center py-4">
              <p class="text-muted">No tienes premios disponibles para canjear.</p>
            </div>
            <div v-else>
              <ul class="list-group">
                <li v-for="reward in rewards" :key="reward.id" class="list-group-item d-flex justify-content-between align-items-center">
                  {{ reward.name }} - {{ reward.businessName }}
                  <span class="badge bg-success rounded-pill">Disponible</span>
                </li>
              </ul>
            </div>
            <div class="mt-3">
              <router-link to="/client/rewards" class="btn btn-success">Ver todos mis premios</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row">
      <div class="col-12 mb-4">
        <div class="card">
          <div class="card-header bg-info text-white">
            <h5 class="card-title mb-0">Últimas Transacciones</h5>
          </div>
          <div class="card-body">
            <div v-if="transactions.length === 0" class="text-center py-4">
              <p class="text-muted">No tienes transacciones recientes.</p>
            </div>
            <div v-else>
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Negocio</th>
                      <th>Tipo</th>
                      <th>Monto</th>
                      <th>Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="transaction in transactions" :key="transaction.id">
                      <td>{{ formatDate(transaction.timestamp) }}</td>
                      <td>{{ transaction.businessName }}</td>
                      <td>{{ transaction.type }}</td>
                      <td>{{ transaction.amount ? `$${transaction.amount}` : '-' }}</td>
                      <td>{{ transaction.points }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="mt-3">
              <router-link to="/client/transactions" class="btn btn-info">Ver todas mis transacciones</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

const authStore = useAuthStore();
const clientBusinesses = ref([]);
const rewards = ref([]);
const transactions = ref([]);

onMounted(async () => {
  if (authStore.isAuthenticated && authStore.isBusinessClient) {
    // Cargar los negocios del cliente
    clientBusinesses.value = authStore.clientBusinesses;
    
    // Cargar premios disponibles
    await loadAvailableRewards();
    
    // Cargar últimas transacciones
    await loadRecentTransactions();
  }
});

async function loadAvailableRewards() {
  if (!authStore.user) return;
  
  try {
    const rewardsQuery = query(
      collection(db, "client_rewards"),
      where("clientId", "==", authStore.user.uid),
      where("redeemed", "==", false),
      limit(5)
    );
    
    const snapshot = await getDocs(rewardsQuery);
    rewards.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error al cargar premios:", error);
  }
}

async function loadRecentTransactions() {
  if (!authStore.user) return;
  
  try {
    const transactionsQuery = query(
      collection(db, "transactions"),
      where("clientId", "==", authStore.user.uid),
      orderBy("timestamp", "desc"),
      limit(5)
    );
    
    const snapshot = await getDocs(transactionsQuery);
    transactions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error al cargar transacciones:", error);
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
.client-dashboard {
  padding-bottom: 2rem;
}
</style>
