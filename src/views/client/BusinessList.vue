<template>
  <div class="business-list">
    <h2 class="mb-4">Mis Negocios</h2>
    
    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">Cargando tus negocios...</p>
        </div>
        
        <div v-else-if="businesses.length === 0" class="text-center py-5">
          <div class="alert alert-info" role="alert">
            <h4 class="alert-heading">No estás registrado en ningún negocio</h4>
            <p>Cuando te registres en un negocio, aparecerá en esta lista.</p>
          </div>
        </div>
        
        <div v-else class="row row-cols-1 row-cols-md-2 g-4">
          <div v-for="business in businesses" :key="business.businessId" class="col">
            <div class="card h-100">
              <div class="card-header bg-primary text-white">
                <h5 class="card-title mb-0">{{ business.businessName }}</h5>
              </div>
              <div class="card-body">
                <div class="d-flex justify-content-between mb-3">
                  <div>
                    <p class="card-text mb-1"><strong>Puntos acumulados:</strong></p>
                    <h3 class="text-primary">{{ business.points || 0 }}</h3>
                  </div>
                  <div>
                    <p class="card-text mb-1"><strong>Nivel:</strong></p>
                    <h3 class="text-success">{{ calculateLevel(business.points || 0) }}</h3>
                  </div>
                </div>
                
                <div class="progress mb-3">
                  <div 
                    class="progress-bar bg-success" 
                    role="progressbar" 
                    :style="`width: ${calculateProgress(business.points || 0)}%`" 
                    :aria-valuenow="calculateProgress(business.points || 0)" 
                    aria-valuemin="0" 
                    aria-valuemax="100">
                    {{ calculateProgress(business.points || 0) }}%
                  </div>
                </div>
                
                <p class="card-text" v-if="business.description">{{ business.description }}</p>
                <p class="card-text"><small class="text-muted">Cliente desde: {{ formatDate(business.joinedAt) }}</small></p>
              </div>
              <div class="card-footer">
                <router-link :to="`/client/business/${business.businessId}`" class="btn btn-primary w-100">
                  Ver detalles
                </router-link>
              </div>
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
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

const authStore = useAuthStore();
const businesses = ref([]);
const loading = ref(true);

onMounted(async () => {
  if (authStore.isAuthenticated && authStore.isBusinessClient) {
    await loadBusinesses();
  }
});

async function loadBusinesses() {
  loading.value = true;
  
  try {
    // Obtener las relaciones cliente-negocio
    const clientBusinessesQuery = query(
      collection(db, "client_businesses"),
      where("clientId", "==", authStore.user.uid)
    );
    
    const clientBusinessesSnapshot = await getDocs(clientBusinessesQuery);
    const businessPromises = clientBusinessesSnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      
      // Obtener información adicional del negocio
      const businessDoc = await getDoc(doc(db, "businesses", data.businessId));
      
      if (businessDoc.exists()) {
        return {
          id: docSnap.id,
          businessId: data.businessId,
          businessName: businessDoc.data().name,
          description: businessDoc.data().description,
          points: data.points || 0,
          joinedAt: data.createdAt,
          ...data
        };
      }
      return null;
    });
    
    const businessesData = await Promise.all(businessPromises);
    businesses.value = businessesData.filter(business => business !== null);
  } catch (error) {
    console.error("Error al cargar negocios:", error);
  } finally {
    loading.value = false;
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
    year: 'numeric'
  });
}
</script>

<style scoped>
.business-list {
  padding-bottom: 2rem;
}
</style>
