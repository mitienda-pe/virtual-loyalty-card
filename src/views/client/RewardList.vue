<template>
  <div class="reward-list">
    <h2 class="mb-4">Mis Premios</h2>
    
    <div class="card">
      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Premios Disponibles</h5>
        <div class="d-flex">
          <select v-model="businessFilter" class="form-select form-select-sm me-2">
            <option value="">Todos los negocios</option>
            <option v-for="business in businesses" :key="business.businessId" :value="business.businessId">
              {{ business.businessName }}
            </option>
          </select>
          <select v-model="statusFilter" class="form-select form-select-sm">
            <option value="">Todos los estados</option>
            <option value="available">Disponibles</option>
            <option value="redeemed">Canjeados</option>
          </select>
        </div>
      </div>
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">Cargando premios...</p>
        </div>
        
        <div v-else-if="filteredRewards.length === 0" class="text-center py-5">
          <div class="alert alert-info" role="alert">
            <h4 class="alert-heading">No hay premios</h4>
            <p>No se encontraron premios con los filtros seleccionados.</p>
          </div>
        </div>
        
        <div v-else class="row row-cols-1 row-cols-md-2 g-4">
          <div v-for="reward in filteredRewards" :key="reward.id" class="col">
            <div class="card h-100" :class="{ 'border-success': !reward.redeemed, 'border-secondary': reward.redeemed }">
              <div class="card-header" :class="reward.redeemed ? 'bg-secondary text-white' : 'bg-success text-white'">
                <div class="d-flex justify-content-between align-items-center">
                  <h5 class="card-title mb-0">{{ reward.rewardName }}</h5>
                  <span class="badge" :class="reward.redeemed ? 'bg-dark' : 'bg-light text-success'">
                    {{ reward.redeemed ? 'Canjeado' : 'Disponible' }}
                  </span>
                </div>
              </div>
              <div class="card-body">
                <h6 class="card-subtitle mb-2 text-muted">{{ reward.businessName }}</h6>
                <p class="card-text" v-if="reward.description">{{ reward.description }}</p>
                <p class="card-text"><strong>Costo:</strong> {{ reward.pointsCost }} puntos</p>
                <p class="card-text"><small class="text-muted">Obtenido el: {{ formatDate(reward.createdAt) }}</small></p>
                <p class="card-text" v-if="reward.redeemedAt">
                  <small class="text-muted">Canjeado el: {{ formatDate(reward.redeemedAt) }}</small>
                </p>
              </div>
              <div class="card-footer">
                <div class="d-flex justify-content-between align-items-center">
                  <router-link :to="`/client/business/${reward.businessId}`" class="btn btn-sm btn-outline-primary">
                    Ver negocio
                  </router-link>
                  <div v-if="!reward.redeemed">
                    <button class="btn btn-success" @click="showRewardQR(reward)">
                      Mostrar QR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para mostrar el QR del premio -->
    <div class="modal fade" id="rewardQRModal" tabindex="-1" aria-labelledby="rewardQRModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title" id="rewardQRModalLabel">{{ selectedReward?.rewardName }}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center">
            <h6 class="mb-3">{{ selectedReward?.businessName }}</h6>
            <div class="qr-container mb-3">
              <img 
                v-if="selectedReward"
                :src="`https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(selectedReward.id)}&chs=250x250&choe=UTF-8&chld=L|2`" 
                alt="QR Code" 
                class="img-fluid"
              />
            </div>
            <p class="mb-1"><strong>Costo:</strong> {{ selectedReward?.pointsCost }} puntos</p>
            <p class="mb-3"><small class="text-muted">Muestra este código al personal del negocio para canjear tu premio</small></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

const authStore = useAuthStore();
const rewards = ref([]);
const businesses = ref([]);
const loading = ref(true);
const businessFilter = ref('');
const statusFilter = ref('');
const selectedReward = ref(null);
let rewardQRModal = null;

const filteredRewards = computed(() => {
  return rewards.value.filter(reward => {
    const matchesBusiness = !businessFilter.value || reward.businessId === businessFilter.value;
    const matchesStatus = !statusFilter.value || 
                          (statusFilter.value === 'available' && !reward.redeemed) || 
                          (statusFilter.value === 'redeemed' && reward.redeemed);
    return matchesBusiness && matchesStatus;
  });
});

onMounted(async () => {
  if (authStore.isAuthenticated && authStore.isBusinessClient) {
    await loadBusinesses();
    await loadRewards();
    
    // Inicializar el modal de Bootstrap
    rewardQRModal = new bootstrap.Modal(document.getElementById('rewardQRModal'));
  }
});

async function loadBusinesses() {
  businesses.value = authStore.clientBusinesses;
}

async function loadRewards() {
  loading.value = true;
  
  try {
    const rewardsQuery = query(
      collection(db, "client_rewards"),
      where("clientId", "==", authStore.user.uid),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(rewardsQuery);
    rewards.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error al cargar premios:", error);
  } finally {
    loading.value = false;
  }
}

function showRewardQR(reward) {
  selectedReward.value = reward;
  rewardQRModal.show();
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
.reward-list {
  padding-bottom: 2rem;
}

.qr-container {
  max-width: 250px;
  margin: 0 auto;
}
</style>
