<template>
  <div class="business-detail">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2">Cargando información del negocio...</p>
    </div>
    
    <div v-else-if="!business" class="alert alert-danger" role="alert">
      No se encontró el negocio solicitado.
    </div>
    
    <div v-else>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>{{ business.name }}</h2>
        <router-link to="/client/businesses" class="btn btn-outline-primary">
          <i class="bi bi-arrow-left"></i> Volver a mis negocios
        </router-link>
      </div>
      
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card mb-4">
            <div class="card-header bg-primary text-white">
              <h5 class="card-title mb-0">Mi Tarjeta de Fidelidad</h5>
            </div>
            <div class="card-body">
              <div class="loyalty-card p-3 border rounded bg-light">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h4>{{ business.name }}</h4>
                  <span class="badge bg-success">{{ calculateLevel(clientBusiness.points || 0) }}</span>
                </div>
                
                <div class="mb-3">
                  <p class="mb-1"><strong>Cliente:</strong> {{ authStore.user?.email }}</p>
                  <p class="mb-1"><strong>ID de Cliente:</strong> {{ clientId }}</p>
                  <p class="mb-0"><strong>Desde:</strong> {{ formatDate(clientBusiness.createdAt) }}</p>
                </div>
                
                <div class="mb-3">
                  <div class="d-flex justify-content-between mb-1">
                    <span><strong>Puntos acumulados:</strong></span>
                    <span>{{ clientBusiness.points || 0 }} pts</span>
                  </div>
                  <div class="progress">
                    <div 
                      class="progress-bar bg-success" 
                      role="progressbar" 
                      :style="`width: ${calculateProgress(clientBusiness.points || 0)}%`" 
                      :aria-valuenow="calculateProgress(clientBusiness.points || 0)" 
                      aria-valuemin="0" 
                      aria-valuemax="100">
                      {{ calculateProgress(clientBusiness.points || 0) }}%
                    </div>
                  </div>
                </div>
                
                <div class="text-center mt-4">
                  <img 
                    :src="`https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(clientId)}&chs=200x200&choe=UTF-8&chld=L|2`" 
                    alt="QR Code" 
                    class="img-fluid qr-code"
                  />
                  <p class="mt-2 small text-muted">Muestra este código al realizar una compra</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="card mb-4">
            <div class="card-header bg-info text-white">
              <h5 class="card-title mb-0">Información del Negocio</h5>
            </div>
            <div class="card-body">
              <p v-if="business.description">{{ business.description }}</p>
              <p v-if="business.address"><strong>Dirección:</strong> {{ business.address }}</p>
              <p v-if="business.phone"><strong>Teléfono:</strong> {{ business.phone }}</p>
              <p v-if="business.email"><strong>Email:</strong> {{ business.email }}</p>
              <p v-if="business.website"><strong>Sitio web:</strong> <a :href="business.website" target="_blank">{{ business.website }}</a></p>
              
              <div v-if="business.pointsPerCurrency" class="alert alert-info mt-3">
                <p class="mb-0"><strong>Política de puntos:</strong> {{ business.pointsPerCurrency }} puntos por cada $1 gastado</p>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-header bg-success text-white">
              <h5 class="card-title mb-0">Premios Disponibles</h5>
            </div>
            <div class="card-body">
              <div v-if="availableRewards.length === 0" class="text-center py-3">
                <p class="text-muted">No hay premios disponibles actualmente.</p>
              </div>
              <div v-else>
                <div class="list-group">
                  <div v-for="reward in availableRewards" :key="reward.id" class="list-group-item list-group-item-action">
                    <div class="d-flex w-100 justify-content-between">
                      <h5 class="mb-1">{{ reward.name }}</h5>
                      <span class="badge bg-primary">{{ reward.pointsCost }} pts</span>
                    </div>
                    <p class="mb-1">{{ reward.description }}</p>
                    <div class="d-flex justify-content-between align-items-center">
                      <small class="text-muted">Válido hasta: {{ formatDate(reward.validUntil) }}</small>
                      <button 
                        class="btn btn-sm btn-success" 
                        :disabled="clientBusiness.points < reward.pointsCost"
                        @click="redeemReward(reward)">
                        Canjear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="card-title mb-0">Mis Últimas Transacciones</h5>
        </div>
        <div class="card-body">
          <div v-if="transactions.length === 0" class="text-center py-4">
            <p class="text-muted">No tienes transacciones con este negocio.</p>
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Puntos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="transaction in transactions" :key="transaction.id">
                  <td>{{ formatDate(transaction.timestamp) }}</td>
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { 
  doc, getDoc, collection, query, where, orderBy, limit, getDocs,
  addDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/firebase';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const businessId = ref(route.params.businessId);
const business = ref(null);
const clientBusiness = ref({});
const clientId = ref('');
const transactions = ref([]);
const availableRewards = ref([]);
const loading = ref(true);

onMounted(async () => {
  if (authStore.isAuthenticated && authStore.isBusinessClient) {
    clientId.value = authStore.user.uid;
    await loadBusinessData();
    await loadClientBusinessData();
    await loadTransactions();
    await loadAvailableRewards();
    loading.value = false;
  }
});

async function loadBusinessData() {
  try {
    const businessDoc = await getDoc(doc(db, "businesses", businessId.value));
    if (businessDoc.exists()) {
      business.value = {
        id: businessDoc.id,
        ...businessDoc.data()
      };
    } else {
      business.value = null;
    }
  } catch (error) {
    console.error("Error al cargar datos del negocio:", error);
    business.value = null;
  }
}

async function loadClientBusinessData() {
  try {
    const clientBusinessQuery = query(
      collection(db, "client_businesses"),
      where("clientId", "==", authStore.user.uid),
      where("businessId", "==", businessId.value)
    );
    
    const snapshot = await getDocs(clientBusinessQuery);
    if (!snapshot.empty) {
      clientBusiness.value = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };
    } else {
      // Si no existe la relación, redirigir a la lista de negocios
      router.push('/client/businesses');
    }
  } catch (error) {
    console.error("Error al cargar datos de cliente-negocio:", error);
  }
}

async function loadTransactions() {
  try {
    const transactionsQuery = query(
      collection(db, "transactions"),
      where("clientId", "==", authStore.user.uid),
      where("businessId", "==", businessId.value),
      orderBy("timestamp", "desc"),
      limit(10)
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

async function loadAvailableRewards() {
  try {
    const rewardsQuery = query(
      collection(db, "rewards"),
      where("businessId", "==", businessId.value),
      where("active", "==", true)
    );
    
    const snapshot = await getDocs(rewardsQuery);
    availableRewards.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).filter(reward => {
      // Filtrar solo los premios válidos (fecha de validez no expirada)
      if (reward.validUntil) {
        const validUntil = reward.validUntil.toDate ? reward.validUntil.toDate() : new Date(reward.validUntil);
        return validUntil > new Date();
      }
      return true;
    });
  } catch (error) {
    console.error("Error al cargar premios disponibles:", error);
  }
}

async function redeemReward(reward) {
  if (clientBusiness.value.points < reward.pointsCost) {
    alert("No tienes suficientes puntos para canjear este premio.");
    return;
  }
  
  try {
    // 1. Crear registro de premio canjeado
    const clientRewardRef = await addDoc(collection(db, "client_rewards"), {
      clientId: authStore.user.uid,
      businessId: businessId.value,
      rewardId: reward.id,
      rewardName: reward.name,
      businessName: business.value.name,
      pointsCost: reward.pointsCost,
      redeemed: false,
      createdAt: serverTimestamp()
    });
    
    // 2. Crear transacción de canje de premio
    await addDoc(collection(db, "transactions"), {
      clientId: authStore.user.uid,
      businessId: businessId.value,
      businessName: business.value.name,
      type: "reward",
      description: `Canje de premio: ${reward.name}`,
      points: -reward.pointsCost,
      timestamp: serverTimestamp(),
      rewardId: reward.id,
      clientRewardId: clientRewardRef.id
    });
    
    // 3. Actualizar puntos del cliente
    const newPoints = (clientBusiness.value.points || 0) - reward.pointsCost;
    await updateDoc(doc(db, "client_businesses", clientBusiness.value.id), {
      points: newPoints,
      updatedAt: serverTimestamp()
    });
    
    // 4. Actualizar datos locales
    clientBusiness.value.points = newPoints;
    
    // 5. Recargar transacciones
    await loadTransactions();
    
    alert(`¡Has canjeado el premio "${reward.name}" exitosamente!`);
  } catch (error) {
    console.error("Error al canjear premio:", error);
    alert("Ocurrió un error al canjear el premio. Por favor, intenta nuevamente.");
  }
}

function calculateLevel(points) {
  if (points >= 1000) return "Platino";
  if (points >= 500) return "Oro";
  if (points >= 200) return "Plata";
  return "Bronce";
}

function calculateProgress(points) {
  if (points >= 1000) return 100;
  if (points >= 500) return Math.round((points - 500) / 5) + 50;
  if (points >= 200) return Math.round((points - 200) / 6) + 20;
  return Math.round(points / 2);
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
.business-detail {
  padding-bottom: 2rem;
}

.loyalty-card {
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.qr-code {
  max-width: 200px;
  margin: 0 auto;
}
</style>
