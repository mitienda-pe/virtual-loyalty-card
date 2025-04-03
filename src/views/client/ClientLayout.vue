<template>
  <div class="client-layout">
    <header class="bg-primary text-white p-3">
      <div class="container">
        <div class="d-flex justify-content-between align-items-center">
          <h1 class="h4 mb-0">Tarjeta de Fidelidad Virtual</h1>
          <div class="dropdown">
            <button class="btn btn-primary dropdown-toggle" type="button" id="userMenu" data-bs-toggle="dropdown" aria-expanded="false">
              {{ user?.email || 'Usuario' }}
            </button>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenu">
              <li><router-link class="dropdown-item" to="/client">Dashboard</router-link></li>
              <li><router-link class="dropdown-item" to="/client/businesses">Mis Negocios</router-link></li>
              <li><router-link class="dropdown-item" to="/client/transactions">Mis Transacciones</router-link></li>
              <li><router-link class="dropdown-item" to="/client/rewards">Mis Premios</router-link></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item" href="#" @click.prevent="logout">Cerrar Sesión</a></li>
            </ul>
          </div>
        </div>
      </div>
    </header>

    <div class="container py-4">
      <div class="row">
        <div class="col-md-3 mb-4">
          <div class="list-group">
            <router-link to="/client" class="list-group-item list-group-item-action" :class="{ active: $route.name === 'ClientDashboard' }">
              Dashboard
            </router-link>
            <router-link to="/client/businesses" class="list-group-item list-group-item-action" :class="{ active: $route.name === 'ClientBusinesses' }">
              Mis Negocios
            </router-link>
            <router-link to="/client/transactions" class="list-group-item list-group-item-action" :class="{ active: $route.name === 'ClientTransactions' }">
              Mis Transacciones
            </router-link>
            <router-link to="/client/rewards" class="list-group-item list-group-item-action" :class="{ active: $route.name === 'ClientRewards' }">
              Mis Premios
            </router-link>
          </div>
        </div>
        <div class="col-md-9">
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const user = computed(() => authStore.user);

const logout = async () => {
  await authStore.signOut();
  router.push('/login');
};
</script>

<style scoped>
.client-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  flex: 1;
}
</style>
