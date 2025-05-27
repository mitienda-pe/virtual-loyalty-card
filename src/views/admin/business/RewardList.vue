<template>
  <div class="reward-list">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2>Negocios</h2>
    </div>
    
    <div class="card">
      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Lista de Premios</h5>
        <div class="d-flex">
          <input 
            type="text" 
            class="form-control form-control-sm me-2" 
            placeholder="Buscar premio..." 
            v-model="searchTerm"
            @input="filterRewards"
          >
          <select v-model="statusFilter" class="form-select form-select-sm" @change="filterRewards">
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
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
            <h4 class="alert-heading">No se encontraron premios</h4>
            <p>No hay premios registrados o ninguno coincide con los filtros seleccionados.</p>
          </div>
        </div>
        
        <div v-else class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          <div v-for="reward in filteredRewards" :key="reward.id" class="col">
            <div class="card h-100" :class="{ 'border-success': reward.active, 'border-secondary': !reward.active }">
              <div class="card-header" :class="reward.active ? 'bg-success text-white' : 'bg-secondary text-white'">
                <div class="d-flex justify-content-between align-items-center">
                  <h5 class="card-title mb-0">{{ reward.name }}</h5>
                  <span class="badge" :class="reward.active ? 'bg-light text-success' : 'bg-dark'">
                    {{ reward.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
              </div>
              <div class="card-body">
                <p class="card-text">{{ reward.description }}</p>
                <div class="d-flex justify-content-between mb-3">
                  <div>
                    <p class="mb-0"><strong>Costo:</strong></p>
                    <h4 class="text-primary">{{ reward.pointsCost }} puntos</h4>
                  </div>
                  <div v-if="reward.validUntil">
                    <p class="mb-0"><strong>Válido hasta:</strong></p>
                    <p :class="isExpired(reward.validUntil) ? 'text-danger' : 'text-success'">
                      {{ formatDate(reward.validUntil) }}
                    </p>
                  </div>
                </div>
                
                <p v-if="reward.limitPerClient" class="card-text">
                  <small class="text-muted">Límite por cliente: {{ reward.limitPerClient }}</small>
                </p>
                
                <p class="card-text">
                  <small class="text-muted">Creado: {{ formatDate(reward.createdAt) }}</small>
                </p>
                
                <div class="reward-stats mt-3 p-2 bg-light rounded">
                  <p class="mb-1"><strong>Estadísticas:</strong></p>
                  <div class="d-flex justify-content-between">
                    <span>Canjeados: {{ reward.redeemedCount || 0 }}</span>
                    <span>Pendientes: {{ reward.pendingCount || 0 }}</span>
                  </div>
                </div>
              </div>
              <div class="card-footer">
                <div class="d-flex justify-content-between">
                  <button class="btn btn-sm btn-outline-primary" @click="viewRewardDetails(reward)">
                    <i class="bi bi-eye"></i> Detalles
                  </button>
                  <div>
                    <router-link :to="`/admin/business/rewards/${reward.id}/edit`" class="btn btn-sm btn-outline-secondary me-1">
                      <i class="bi bi-pencil"></i> Editar
                    </router-link>
                    <button 
                      class="btn btn-sm" 
                      :class="reward.active ? 'btn-outline-danger' : 'btn-outline-success'"
                      @click="toggleRewardStatus(reward)"
                    >
                      <i :class="reward.active ? 'bi bi-x-circle' : 'bi bi-check-circle'"></i>
                      {{ reward.active ? 'Desactivar' : 'Activar' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para ver detalles del premio -->
    <div class="modal fade" id="rewardDetailsModal" tabindex="-1" aria-labelledby="rewardDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="rewardDetailsModalLabel">Detalles del Premio</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" v-if="selectedReward">
            <div class="row">
              <div class="col-md-6">
                <h5>Información del Premio</h5>
                <p><strong>Nombre:</strong> {{ selectedReward.name }}</p>
                <p><strong>Descripción:</strong> {{ selectedReward.description }}</p>
                <p><strong>Costo:</strong> {{ selectedReward.pointsCost }} puntos</p>
                <p><strong>Estado:</strong> 
                  <span class="badge" :class="selectedReward.active ? 'bg-success' : 'bg-secondary'">
                    {{ selectedReward.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </p>
                <p v-if="selectedReward.validUntil">
                  <strong>Válido hasta:</strong> 
                  <span :class="isExpired(selectedReward.validUntil) ? 'text-danger' : 'text-success'">
                    {{ formatDate(selectedReward.validUntil) }}
                  </span>
                </p>
                <p v-if="selectedReward.limitPerClient">
                  <strong>Límite por cliente:</strong> {{ selectedReward.limitPerClient }}
                </p>
                <p><strong>Creado:</strong> {{ formatDate(selectedReward.createdAt) }}</p>
                <p v-if="selectedReward.updatedAt"><strong>Última actualización:</strong> {{ formatDate(selectedReward.updatedAt) }}</p>
              </div>
              <div class="col-md-6">
                <h5>Estadísticas</h5>
                <div class="card mb-3">
                  <div class="card-body">
                    <div class="row text-center">
                      <div class="col-6">
                        <h2 class="text-primary">{{ selectedReward.redeemedCount || 0 }}</h2>
                        <p>Canjeados</p>
                      </div>
                      <div class="col-6">
                        <h2 class="text-warning">{{ selectedReward.pendingCount || 0 }}</h2>
                        <p>Pendientes</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <h5>Últimos Canjes</h5>
                <div v-if="rewardRedemptions.length === 0" class="text-center py-3">
                  <p class="text-muted">No hay canjes registrados.</p>
                </div>
                <div v-else class="table-responsive">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="redemption in rewardRedemptions" :key="redemption.id">
                        <td>{{ formatDate(redemption.createdAt) }}</td>
                        <td>{{ redemption.clientEmail || redemption.clientId }}</td>
                        <td>
                          <span :class="`badge ${redemption.redeemed ? 'bg-success' : 'bg-warning'}`">
                            {{ redemption.redeemed ? 'Canjeado' : 'Pendiente' }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            <router-link 
              v-if="selectedReward" 
              :to="`/admin/business/rewards/${selectedReward.id}/edit`" 
              class="btn btn-primary"
            >
              Editar Premio
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { 
  collection, query, where, orderBy, getDocs, getDoc, doc,
  updateDoc, serverTimestamp, limit
} from 'firebase/firestore';
import { db } from '@/firebase';

const authStore = useAuthStore();
const rewards = ref([]);
const filteredRewards = ref([]);
const loading = ref(true);
const searchTerm = ref('');
const statusFilter = ref('');
const selectedReward = ref(null);
const rewardRedemptions = ref([]);

// Referencias a los modales de Bootstrap
let rewardDetailsModal = null;

const businessId = computed(() => authStore.businessId);

onMounted(async () => {
  if (authStore.isAuthenticated && (authStore.isBusinessAdmin || authStore.isSuperAdmin)) {
    // Inicializar modales de Bootstrap
    rewardDetailsModal = new bootstrap.Modal(document.getElementById('rewardDetailsModal'));
    
    await loadRewards();
    loading.value = false;
  }
});

async function loadRewards() {
  try {
    const rewardsQuery = query(
      collection(db, "rewards"),
      where("businessId", "==", businessId.value)
    );
    
    const rewardsSnapshot = await getDocs(rewardsQuery);
    
    // Obtener estadísticas de canjes para cada premio
    const rewardsWithStats = await Promise.all(rewardsSnapshot.docs.map(async (docSnap) => {
      const reward = {
        id: docSnap.id,
        ...docSnap.data(),
        redeemedCount: 0,
        pendingCount: 0
      };
      
      // Contar canjes
      const clientRewardsQuery = query(
        collection(db, "client_rewards"),
        where("rewardId", "==", reward.id)
      );
      
      const clientRewardsSnapshot = await getDocs(clientRewardsQuery);
      
      clientRewardsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.redeemed) {
          reward.redeemedCount++;
        } else {
          reward.pendingCount++;
        }
      });
      
      return reward;
    }));
    
    rewards.value = rewardsWithStats;
    filterRewards();
  } catch (error) {
    console.error("Error al cargar premios:", error);
  }
}

function filterRewards() {
  if (!searchTerm.value && !statusFilter.value) {
    filteredRewards.value = [...rewards.value];
    return;
  }
  
  filteredRewards.value = rewards.value.filter(reward => {
    const matchesSearch = !searchTerm.value || 
      reward.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      (reward.description && reward.description.toLowerCase().includes(searchTerm.value.toLowerCase()));
    
    const matchesStatus = !statusFilter.value || 
      (statusFilter.value === 'active' && reward.active) || 
      (statusFilter.value === 'inactive' && !reward.active);
    
    return matchesSearch && matchesStatus;
  });
}

async function viewRewardDetails(reward) {
  selectedReward.value = reward;
  
  // Cargar canjes del premio
  await loadRewardRedemptions(reward.id);
  
  rewardDetailsModal.show();
}

async function loadRewardRedemptions(rewardId) {
  try {
    const redemptionsQuery = query(
      collection(db, "client_rewards"),
      where("rewardId", "==", rewardId),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    
    const snapshot = await getDocs(redemptionsQuery);
    
    // Obtener información adicional de los clientes
    const redemptionsWithClientInfo = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const redemption = {
        id: docSnap.id,
        ...docSnap.data()
      };
      
      try {
        // Intentar obtener el email del cliente
        const userDoc = await getDoc(doc(db, "users", redemption.clientId));
        if (userDoc.exists()) {
          redemption.clientEmail = userDoc.data().email;
        }
      } catch (error) {
        console.error("Error al obtener datos del cliente:", error);
      }
      
      return redemption;
    }));
    
    rewardRedemptions.value = redemptionsWithClientInfo;
  } catch (error) {
    console.error("Error al cargar canjes del premio:", error);
    rewardRedemptions.value = [];
  }
}

async function toggleRewardStatus(reward) {
  try {
    const newStatus = !reward.active;
    
    await updateDoc(doc(db, "rewards", reward.id), {
      active: newStatus,
      updatedAt: serverTimestamp()
    });
    
    // Actualizar el estado localmente
    reward.active = newStatus;
    
    alert(`Premio ${newStatus ? 'activado' : 'desactivado'} exitosamente.`);
  } catch (error) {
    console.error("Error al cambiar estado del premio:", error);
    alert("Error al cambiar estado del premio: " + error.message);
  }
}

function isExpired(date) {
  if (!date) return false;
  
  const validUntil = date.toDate ? date.toDate() : new Date(date);
  return validUntil < new Date();
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
.reward-list {
  padding-bottom: 2rem;
}

.reward-stats {
  font-size: 0.9rem;
}
</style>
