<!-- src/views/admin/Statistics.vue -->
<template>
  <div class="container-fluid">
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h1 class="h3 mb-0">Estadísticas</h1>
                <p class="text-muted">Análisis de datos de la plataforma</p>
              </div>
              <div>
                <button class="btn btn-outline-primary" @click="refreshData">
                  <i class="bi bi-arrow-clockwise me-1"></i> Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtros de fecha -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label for="dateRange" class="form-label">Rango de fechas</label>
                <select class="form-select" id="dateRange" v-model="dateRange" @change="applyDateRange">
                  <option value="7">Últimos 7 días</option>
                  <option value="30">Últimos 30 días</option>
                  <option value="90">Últimos 3 meses</option>
                  <option value="180">Últimos 6 meses</option>
                  <option value="365">Último año</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
              <div class="col-md-3" v-if="dateRange === 'custom'">
                <label for="startDate" class="form-label">Fecha inicial</label>
                <input type="date" class="form-control" id="startDate" v-model="startDate" @change="applyCustomDateRange">
              </div>
              <div class="col-md-3" v-if="dateRange === 'custom'">
                <label for="endDate" class="form-label">Fecha final</label>
                <input type="date" class="form-control" id="endDate" v-model="endDate" @change="applyCustomDateRange">
              </div>
              <div class="col-md-2">
                <label for="businessFilter" class="form-label">Negocio</label>
                <select class="form-select" id="businessFilter" v-model="selectedBusiness" @change="applyFilters">
                  <option value="">Todos los negocios</option>
                  <option v-for="business in businesses" :key="business.id" :value="business.id">
                    {{ business.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tarjetas de resumen -->
    <div class="row mb-4">
      <div class="col-md-3 mb-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="text-muted mb-1">Nuevos Usuarios</h6>
                <h2 class="display-6 mb-0">{{ stats.newUsers }}</h2>
              </div>
              <div class="rounded-circle bg-primary bg-opacity-10 p-3">
                <i class="bi bi-person-plus text-primary fs-4"></i>
              </div>
            </div>
            <div class="mt-3">
              <span class="badge" :class="stats.newUsersChange >= 0 ? 'bg-success' : 'bg-danger'">
                <i class="bi" :class="stats.newUsersChange >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                {{ Math.abs(stats.newUsersChange) }}%
              </span>
              <span class="text-muted ms-2">vs. período anterior</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 mb-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="text-muted mb-1">Transacciones</h6>
                <h2 class="display-6 mb-0">{{ stats.transactions }}</h2>
              </div>
              <div class="rounded-circle bg-success bg-opacity-10 p-3">
                <i class="bi bi-receipt text-success fs-4"></i>
              </div>
            </div>
            <div class="mt-3">
              <span class="badge" :class="stats.transactionsChange >= 0 ? 'bg-success' : 'bg-danger'">
                <i class="bi" :class="stats.transactionsChange >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                {{ Math.abs(stats.transactionsChange) }}%
              </span>
              <span class="text-muted ms-2">vs. período anterior</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 mb-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="text-muted mb-1">Premios Canjeados</h6>
                <h2 class="display-6 mb-0">{{ stats.redeemedRewards }}</h2>
              </div>
              <div class="rounded-circle bg-warning bg-opacity-10 p-3">
                <i class="bi bi-gift text-warning fs-4"></i>
              </div>
            </div>
            <div class="mt-3">
              <span class="badge" :class="stats.redeemedRewardsChange >= 0 ? 'bg-success' : 'bg-danger'">
                <i class="bi" :class="stats.redeemedRewardsChange >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                {{ Math.abs(stats.redeemedRewardsChange) }}%
              </span>
              <span class="text-muted ms-2">vs. período anterior</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 mb-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="text-muted mb-1">Tasa de Conversión</h6>
                <h2 class="display-6 mb-0">{{ stats.conversionRate }}%</h2>
              </div>
              <div class="rounded-circle bg-info bg-opacity-10 p-3">
                <i class="bi bi-graph-up text-info fs-4"></i>
              </div>
            </div>
            <div class="mt-3">
              <span class="badge" :class="stats.conversionRateChange >= 0 ? 'bg-success' : 'bg-danger'">
                <i class="bi" :class="stats.conversionRateChange >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                {{ Math.abs(stats.conversionRateChange) }}%
              </span>
              <span class="text-muted ms-2">vs. período anterior</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráficos -->
    <div class="row">
      <div class="col-lg-8 mb-4">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white">
            <h5 class="mb-0">Transacciones por día</h5>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            <div v-else class="chart-container" style="position: relative; height:300px;">
              <canvas ref="transactionsChart"></canvas>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-lg-4 mb-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white">
            <h5 class="mb-0">Distribución por Negocio</h5>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            <div v-else class="chart-container" style="position: relative; height:300px;">
              <canvas ref="businessDistributionChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white">
            <h5 class="mb-0">Negocios más activos</h5>
          </div>
          <div class="card-body p-0">
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Negocio</th>
                    <th class="text-center">Clientes</th>
                    <th class="text-center">Transacciones</th>
                    <th class="text-center">Premios</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="business in topBusinesses" :key="business.id">
                    <td>{{ business.name }}</td>
                    <td class="text-center">{{ business.clients }}</td>
                    <td class="text-center">{{ business.transactions }}</td>
                    <td class="text-center">{{ business.rewards }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-lg-6 mb-4">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white">
            <h5 class="mb-0">Premios más populares</h5>
          </div>
          <div class="card-body p-0">
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Premio</th>
                    <th>Negocio</th>
                    <th class="text-center">Canjes</th>
                    <th class="text-center">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="reward in topRewards" :key="reward.id">
                    <td>{{ reward.name }}</td>
                    <td>{{ reward.business }}</td>
                    <td class="text-center">{{ reward.redemptions }}</td>
                    <td class="text-center">{{ reward.points }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase';
import Chart from 'chart.js/auto';

// Estado
const loading = ref(true);
const businesses = ref([]);
const selectedBusiness = ref('');
const dateRange = ref('30');
const startDate = ref('');
const endDate = ref('');

// Referencias a los gráficos
const transactionsChart = ref(null);
const businessDistributionChart = ref(null);
let transactionsChartInstance = null;
let businessDistributionChartInstance = null;

// Datos para los gráficos y tablas
const stats = ref({
  newUsers: 0,
  newUsersChange: 0,
  transactions: 0,
  transactionsChange: 0,
  redeemedRewards: 0,
  redeemedRewardsChange: 0,
  conversionRate: 0,
  conversionRateChange: 0
});

const topBusinesses = ref([]);
const topRewards = ref([]);
const transactionsData = ref({
  labels: [],
  values: []
});
const businessDistributionData = ref({
  labels: [],
  values: []
});

// Cargar datos iniciales
onMounted(async () => {
  // Inicializar fechas
  initializeDates();
  
  // Cargar datos
  await Promise.all([
    loadBusinesses(),
    loadStatistics()
  ]);
  
  // Inicializar gráficos
  nextTick(() => {
    initializeCharts();
  });
  
  loading.value = false;
});

// Inicializar fechas
function initializeDates() {
  const today = new Date();
  endDate.value = formatDateForInput(today);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  startDate.value = formatDateForInput(thirtyDaysAgo);
}

// Formatear fecha para input type="date"
function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

// Cargar lista de negocios
async function loadBusinesses() {
  try {
    const businessesSnapshot = await getDocs(collection(db, 'businesses'));
    businesses.value = businessesSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name
    }));
  } catch (error) {
    console.error('Error al cargar negocios:', error);
  }
}

// Cargar estadísticas
async function loadStatistics() {
  try {
    // En una aplicación real, estos datos vendrían de la base de datos
    // Por ahora, usaremos datos de ejemplo
    
    // Estadísticas generales
    stats.value = {
      newUsers: 128,
      newUsersChange: 12,
      transactions: 843,
      transactionsChange: 5,
      redeemedRewards: 67,
      redeemedRewardsChange: -3,
      conversionRate: 8.2,
      conversionRateChange: 1.5
    };
    
    // Datos para el gráfico de transacciones
    transactionsData.value = {
      labels: ['1 Jun', '2 Jun', '3 Jun', '4 Jun', '5 Jun', '6 Jun', '7 Jun', '8 Jun', '9 Jun', '10 Jun'],
      values: [25, 30, 45, 60, 35, 42, 50, 55, 40, 48]
    };
    
    // Datos para el gráfico de distribución por negocio
    businessDistributionData.value = {
      labels: ['Café Delicioso', 'Restaurante El Sabor', 'Tienda Moda', 'Librería Central', 'Otros'],
      values: [35, 25, 20, 15, 5]
    };
    
    // Negocios más activos
    topBusinesses.value = [
      { id: '1', name: 'Café Delicioso', clients: 45, transactions: 230, rewards: 18 },
      { id: '2', name: 'Restaurante El Sabor', clients: 32, transactions: 185, rewards: 15 },
      { id: '3', name: 'Tienda Moda', clients: 28, transactions: 120, rewards: 10 },
      { id: '4', name: 'Librería Central', clients: 20, transactions: 95, rewards: 8 },
      { id: '5', name: 'Panadería Suave', clients: 18, transactions: 85, rewards: 6 }
    ];
    
    // Premios más populares
    topRewards.value = [
      { id: '1', name: 'Café gratis', business: 'Café Delicioso', redemptions: 12, points: 50 },
      { id: '2', name: 'Postre gratis', business: 'Restaurante El Sabor', redemptions: 10, points: 100 },
      { id: '3', name: 'Descuento 20%', business: 'Tienda Moda', redemptions: 8, points: 75 },
      { id: '4', name: 'Libro gratis', business: 'Librería Central', redemptions: 6, points: 150 },
      { id: '5', name: 'Pan gratis', business: 'Panadería Suave', redemptions: 5, points: 40 }
    ];
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
}

// Inicializar gráficos
function initializeCharts() {
  // Gráfico de transacciones
  if (transactionsChartInstance) {
    transactionsChartInstance.destroy();
  }
  
  transactionsChartInstance = new Chart(transactionsChart.value, {
    type: 'line',
    data: {
      labels: transactionsData.value.labels,
      datasets: [{
        label: 'Transacciones',
        data: transactionsData.value.values,
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  
  // Gráfico de distribución por negocio
  if (businessDistributionChartInstance) {
    businessDistributionChartInstance.destroy();
  }
  
  businessDistributionChartInstance = new Chart(businessDistributionChart.value, {
    type: 'doughnut',
    data: {
      labels: businessDistributionData.value.labels,
      datasets: [{
        data: businessDistributionData.value.values,
        backgroundColor: [
          '#0d6efd',
          '#198754',
          '#ffc107',
          '#dc3545',
          '#6c757d'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Aplicar rango de fechas predefinido
function applyDateRange() {
  if (dateRange.value === 'custom') return;
  
  const today = new Date();
  endDate.value = formatDateForInput(today);
  
  const days = parseInt(dateRange.value);
  const startDateObj = new Date();
  startDateObj.setDate(today.getDate() - days);
  startDate.value = formatDateForInput(startDateObj);
  
  applyFilters();
}

// Aplicar rango de fechas personalizado
function applyCustomDateRange() {
  if (!startDate.value || !endDate.value) return;
  applyFilters();
}

// Aplicar filtros
function applyFilters() {
  loading.value = true;
  
  // En una aplicación real, aquí se cargarían los datos filtrados
  // Por ahora, simularemos un tiempo de carga
  setTimeout(() => {
    loadStatistics().then(() => {
      nextTick(() => {
        initializeCharts();
        loading.value = false;
      });
    });
  }, 500);
}

// Actualizar datos
function refreshData() {
  loading.value = true;
  
  // En una aplicación real, aquí se recargarían todos los datos
  // Por ahora, simularemos un tiempo de carga
  setTimeout(() => {
    loadStatistics().then(() => {
      nextTick(() => {
        initializeCharts();
        loading.value = false;
      });
    });
  }, 500);
}
</script>

<style scoped>
.chart-container {
  width: 100%;
}

.badge {
  font-weight: 500;
  padding: 0.35em 0.65em;
}
</style>
