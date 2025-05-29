<!-- src/components/admin/SidebarNav.vue -->
<template>
  <div class="sidebar bg-white shadow-sm" :class="{ 'sidebar-collapsed': collapsed, 'sidebar-mobile-open': mobileOpen }">
    <!-- Toggle only -->
    <div class="sidebar-header d-flex align-items-center justify-content-end p-3">
      <button 
        class="btn btn-sm btn-outline-secondary border-0 d-none d-md-block" 
        @click="toggleSidebar"
        :title="collapsed ? 'Expandir menú' : 'Colapsar menú'"
      >
        <i class="bi" :class="collapsed ? 'bi-chevron-right' : 'bi-chevron-left'"></i>
      </button>
      <button 
        class="btn btn-sm btn-outline-danger border-0 d-md-none" 
        @click="closeMobileMenu"
        title="Cerrar menú"
      >
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <!-- User info -->
    <div class="sidebar-user p-3 border-bottom" v-if="!collapsed">
      <div class="d-flex align-items-center">
        <div class="avatar-circle bg-primary bg-opacity-10 text-primary me-3">
          {{ getInitials(authStore.user?.displayName || authStore.user?.email) }}
        </div>
        <div class="overflow-hidden">
          <div class="fw-bold text-truncate">{{ authStore.user?.displayName || 'Usuario' }}</div>
          <div class="text-muted small text-truncate">{{ authStore.user?.email }}</div>
        </div>
      </div>
    </div>
    <div class="sidebar-user p-3 border-bottom text-center" v-else>
      <div class="avatar-circle mx-auto bg-primary bg-opacity-10 text-primary">
        {{ getInitials(authStore.user?.displayName || authStore.user?.email) }}
      </div>
    </div>

    <!-- Navigation -->
    <div class="sidebar-nav p-2">
      <ul class="nav flex-column">
        <!-- SuperAdmin Menu -->
        <template v-if="authStore.isSuperAdmin">
          <!-- Dashboard - Resumen general del sistema -->
          <li class="nav-item">
            <router-link to="/admin" class="nav-link" :class="{ active: $route.path === '/admin' }" @click="handleMobileClick">
              <LayoutDashboard class="me-3" :size="20" />
              <span v-if="!collapsed">Panel Principal</span>
            </router-link>
          </li>

          <!-- Businesses -->
          <li class="nav-item">
            <router-link to="/admin/businesses" class="nav-link" :class="{ active: $route.path.includes('/admin/businesses') }" @click="handleMobileClick">
              <Building2 class="me-3" :size="20" />
              <span v-if="!collapsed">Negocios</span>
            </router-link>
          </li>

          <!-- Users -->
          <li class="nav-item">
            <router-link to="/admin/users" class="nav-link" :class="{ active: $route.path.includes('/admin/users') }" @click="handleMobileClick">
              <Users class="me-3" :size="20" />
              <span v-if="!collapsed">Usuarios</span>
            </router-link>
          </li>

          <!-- Clients -->
          <li class="nav-item">
            <router-link to="/admin/clients" class="nav-link" :class="{ active: $route.path.includes('/admin/clients') }" @click="handleMobileClick">
              <Users class="me-3" :size="20" />
              <span v-if="!collapsed">Clientes</span>
            </router-link>
          </li>

          <!-- Consumptions -->
          <li class="nav-item">
            <router-link to="/admin/client-consumption" class="nav-link" :class="{ active: $route.path === '/admin/client-consumption' }" @click="handleMobileClick">
              <Receipt class="me-3" :size="20" />
              <span v-if="!collapsed">Consumos</span>
            </router-link>
          </li>

          <!-- Statistics - Análisis detallado de datos -->
          <li class="nav-item">
            <router-link to="/admin/statistics" class="nav-link" :class="{ active: $route.path === '/admin/statistics' }" @click="handleMobileClick">
              <BarChart3 class="me-3" :size="20" />
              <span v-if="!collapsed">Análisis de Datos</span>
            </router-link>
          </li>
        </template>

        <!-- Business Admin Menu -->
        <template v-if="authStore.isBusinessAdmin">
          <!-- Dashboard -->
          <li class="nav-item">
            <router-link to="/admin/business/dashboard" class="nav-link" :class="{ active: $route.path === '/admin/business/dashboard' }" @click="handleMobileClick">
              <LayoutDashboard class="me-3" :size="20" />
              <span v-if="!collapsed">Dashboard</span>
            </router-link>
          </li>
          <!-- Mi Negocio (antes Editar Negocio) -->
          <li class="nav-item">
            <router-link to="/admin/business/settings" class="nav-link" :class="{ active: $route.path === '/admin/business/settings' }" @click="handleMobileClick">
              <Store class="me-3" :size="20" />
              <span v-if="!collapsed">Mi negocio</span>
            </router-link>
          </li>

          <!-- Clientes -->
          <li class="nav-item">
            <router-link to="/admin/business/clients" class="nav-link" :class="{ active: $route.path === '/admin/business/clients' }" @click="handleMobileClick">
              <Users class="me-3" :size="20" />
              <span v-if="!collapsed">Clientes</span>
            </router-link>
          </li>

          <!-- Consumos -->
          <li class="nav-item">
            <router-link to="/admin/business/consumos" class="nav-link" :class="{ active: $route.path === '/admin/business/consumos' }" @click="handleMobileClick">
              <Receipt class="me-3" :size="20" />
              <span v-if="!collapsed">Consumos</span>
            </router-link>
          </li>

          <!-- Premios Canjeados -->
          <li class="nav-item">
            <router-link to="/admin/business/rewards" class="nav-link" :class="{ active: $route.path === '/admin/business/rewards' }" @click="handleMobileClick">
              <Gift class="me-3" :size="20" />
              <span v-if="!collapsed">Premios Canjeados</span>
            </router-link>
          </li>
        </template>

        <!-- Common Menu Items -->
        <li class="nav-item">
          <router-link to="/admin/profile" class="nav-link" :class="{ active: $route.path === '/admin/profile' }" @click="handleMobileClick">
            <User class="me-3" :size="20" />
            <span v-if="!collapsed">Mi Perfil</span>
          </router-link>
        </li>
      </ul>
    </div>

    <!-- Footer -->
    <div class="sidebar-footer p-3 mt-auto border-top">
      <button class="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center" @click="handleLogout">
        <LogOut class="me-2" :size="18" />
        <span v-if="!collapsed">Cerrar sesión</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// Importar iconos de Lucide
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  UserRound,
  Receipt, 
  BarChart3, 
  Store,
  CreditCard, 
  MessageCircle, 
  Settings, 
  LogOut, 
  User, 
  UserCheck,
  Gift
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

// Estado del sidebar
const collapsed = ref(false);
const mobileOpen = ref(false);

// Alternar sidebar en desktop
function toggleSidebar() {
  collapsed.value = !collapsed.value;
  // Guardar preferencia en localStorage
  localStorage.setItem('sidebarCollapsed', collapsed.value);
}

// Abrir menú en móvil
function openMobileMenu() {
  mobileOpen.value = true;
  document.body.classList.add('sidebar-mobile-open-body');
}

// Cerrar menú en móvil
function closeMobileMenu() {
  mobileOpen.value = false;
  document.body.classList.remove('sidebar-mobile-open-body');
}

// Manejar clic en enlaces en móvil
function handleMobileClick() {
  if (window.innerWidth < 768) {
    closeMobileMenu();
  }
}

// Manejar cambio de tamaño de ventana
function handleResize() {
  if (window.innerWidth >= 768 && mobileOpen.value) {
    closeMobileMenu();
  }
}

// Obtener iniciales para el avatar
function getInitials(name) {
  if (!name) return '?';
  
  return name
    .split(/[\s@.]/)
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

// Cerrar sesión
async function handleLogout() {
  try {
    await authStore.signOut();
    router.push('/login');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
}

// Cargar preferencias al iniciar
function loadPreferences() {
  // Cargar estado del sidebar (solo para desktop)
  const savedCollapsed = localStorage.getItem('sidebarCollapsed');
  if (savedCollapsed !== null) {
    collapsed.value = savedCollapsed === 'true';
  }
}

// Exponer métodos para el componente padre
defineExpose({
  openMobileMenu,
  closeMobileMenu
});

// Inicializar
onMounted(() => {
  loadPreferences();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  document.body.classList.remove('sidebar-mobile-open-body');
});
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 250px;
  height: calc(100vh - 56px);
  position: sticky;
  left: 0;
  top: 56px;
  z-index: 1010;
  transition: all 0.3s ease;
}

.sidebar-collapsed {
  width: 70px;
}

.sidebar-logo-text {
  transition: opacity 0.3s ease;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.sidebar-nav {
  overflow-y: auto;
  flex-grow: 1;
}

.nav-link {
  color: #495057;
  border-radius: 0.25rem;
  margin-bottom: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
}

.nav-link:hover {
  background-color: rgba(var(--bs-primary-rgb), 0.05);
  color: var(--bs-primary);
}

.nav-link.active {
  background-color: rgba(var(--bs-primary-rgb), 0.1);
  color: var(--bs-primary);
  font-weight: 500;
}

/* Estilos para móvil */
@media (max-width: 767.98px) {
  .sidebar {
    transform: translateX(-100%);
    width: 250px;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  }
  
  .sidebar-mobile-open {
    transform: translateX(0);
  }
  
  /* Overlay para cuando el menú está abierto */
  .sidebar-mobile-open::after {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: -1;
  }
  
  /* Evitar scroll del body cuando el menú está abierto */
  :global(.sidebar-mobile-open-body) {
    overflow: hidden;
  }
}
</style>
