<!-- src/views/admin/AdminLayout.vue -->
<template>
  <div class="min-h-screen bg-light">
    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
      <div class="container-fluid">
        <router-link to="/" class="navbar-brand fw-bold">
          Tarjeta de Fidelidad Virtual
        </router-link>
        
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <router-link to="/admin" class="nav-link" :class="{ active: $route.path === '/admin' }">
                <i class="bi bi-speedometer2 me-1"></i> Dashboard
              </router-link>
            </li>
            
            <!-- Enlaces para SuperAdmin -->
            <li class="nav-item" v-if="authStore.isSuperAdmin">
              <router-link to="/admin/businesses" class="nav-link" :class="{ active: $route.path.startsWith('/admin/businesses') }">
                <i class="bi bi-building me-1"></i> Negocios
              </router-link>
            </li>
            <li class="nav-item" v-if="authStore.isSuperAdmin">
              <router-link to="/admin/users" class="nav-link" :class="{ active: $route.path.startsWith('/admin/users') }">
                <i class="bi bi-people me-1"></i> Usuarios
              </router-link>
            </li>
            <li class="nav-item" v-if="authStore.isSuperAdmin">
              <router-link to="/admin/statistics" class="nav-link" :class="{ active: $route.path.startsWith('/admin/statistics') }">
                <i class="bi bi-bar-chart me-1"></i> Estadísticas
              </router-link>
            </li>
            <li class="nav-item" v-if="authStore.isSuperAdmin">
              <router-link to="/admin/whatsapp" class="nav-link" :class="{ active: $route.path.startsWith('/admin/whatsapp') }">
                <i class="bi bi-whatsapp me-1"></i> WhatsApp
              </router-link>
            </li>
            
            <!-- Enlaces para Business Admin -->
            <li class="nav-item" v-if="authStore.isBusinessAdmin">
              <router-link to="/admin/business/dashboard" class="nav-link" :class="{ active: $route.path === '/admin/business/dashboard' }">
                <i class="bi bi-speedometer2 me-1"></i> Mi Negocio
              </router-link>
            </li>
            <li class="nav-item" v-if="authStore.isBusinessAdmin">
              <router-link to="/admin/business/clients" class="nav-link" :class="{ active: $route.path === '/admin/business/clients' }">
                <i class="bi bi-people me-1"></i> Clientes
              </router-link>
            </li>
            <li class="nav-item" v-if="authStore.isBusinessAdmin">
              <router-link to="/admin/business/transactions" class="nav-link" :class="{ active: $route.path === '/admin/business/transactions' }">
                <i class="bi bi-cash-stack me-1"></i> Transacciones
              </router-link>
            </li>
            <li class="nav-item" v-if="authStore.isBusinessAdmin">
              <router-link to="/admin/business/rewards" class="nav-link" :class="{ active: $route.path === '/admin/business/rewards' }">
                <i class="bi bi-gift me-1"></i> Premios
              </router-link>
            </li>
          </ul>
          
          <div class="d-flex align-items-center">
            <div class="dropdown">
              <button class="btn btn-light dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-person-circle me-1"></i> {{ authStore.user?.email }}
              </button>
              <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                <li><router-link class="dropdown-item" to="/admin/profile"><i class="bi bi-person me-2"></i>Perfil</router-link></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" @click.prevent="handleLogout"><i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="container-fluid py-4">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

async function handleLogout() {
  try {
    await authStore.signOut();
    router.push('/login');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
}
</script>

<style scoped>
.navbar-brand {
  font-size: 1.25rem;
}

.nav-link {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
}

.nav-link.active {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-link:hover:not(.active) {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>