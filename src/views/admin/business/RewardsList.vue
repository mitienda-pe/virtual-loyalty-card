<template>
  <div class="container py-4">

    <h2 class="mb-4">Premios Canjeados</h2>
    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>
        <div v-else-if="redemptions.length === 0" class="text-center py-4">
          <p class="text-muted">No hay premios canjeados aún.</p>
        </div>
        <div v-else class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Premio</th>
                <th>Consumos Usados</th>
                <th>Aprobado por</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in redemptions" :key="item.id">
                <td>{{ formatDate(item.date) }}</td>
                <td>{{ item.customerName || item.phoneNumber }}</td>
                <td>{{ item.reward }}</td>
                <td>{{ item.consumptionsUsed ? item.consumptionsUsed.length : item.consumptionsNeeded || '' }}</td>
                <td>{{ item.approvedBy }}</td>
                <td>
                  <span :class="item.status === 'approved' ? 'badge bg-success' : 'badge bg-warning'">
                    {{ item.status === 'approved' ? 'Canjeado' : 'Pendiente' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuthStore } from '@/stores/auth';
const authStore = useAuthStore();
const loading = ref(true);
const redemptions = ref([]);

function formatDate(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString('es-PE');
}

async function loadRedemptions() {
  loading.value = true;
  try {
    const businessSlug = authStore.business?.slug || authStore.user?.businessSlug;
    const redemptionsRef = collection(db, `business_redemptions/${businessSlug}/redemptions`);
    const q = query(redemptionsRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    redemptions.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    redemptions.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadRedemptions);
</script>

<style scoped>
.container {
  max-width: 900px;
}
</style>
