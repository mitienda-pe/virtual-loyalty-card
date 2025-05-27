<!-- src/views/admin/AdminLayout.vue -->
<template>
  <div class="admin-layout d-flex">
    <!-- Sidebar Navigation -->
    <SidebarNav ref="sidebarNavRef" />
    
    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Top Header -->
      <header class="header bg-white shadow-sm py-3 px-4 d-flex justify-content-between align-items-center sticky-top">
        <div class="d-flex align-items-center">
          <!-- Botón de menú hamburguesa para móvil -->
          <button 
            class="btn btn-light me-3 d-md-none" 
            @click="toggleMobileMenu"
            aria-label="Menú"
          >
            <Menu class="fs-4" />
          </button>
          
          <!-- Título de la página con descripción -->
          <div>
            <h4 class="mb-0">{{ pageTitle }}</h4>
            <p class="text-muted small mb-0" v-if="pageDescription">{{ pageDescription }}</p>
          </div>
        </div>
        
        <div class="d-flex align-items-center">
          <!-- Botón de acción principal (si aplica) -->
          <button 
            v-if="showActionButton" 
            class="btn btn-primary me-3"
            @click="handleActionButton"
          >
            <component :is="actionButtonIcon" />
            <span class="ms-1 d-none d-md-inline">{{ actionButtonText }}</span>
          </button>
          
          <!-- Notificaciones (solo visible en pantallas medianas y grandes) -->
          <div class="dropdown me-3 d-none d-md-block">
            <button class="btn btn-light position-relative" type="button" id="notificationsDropdown" data-bs-toggle="dropdown" aria-expanded="false">
              <Bell />
              <span v-if="notificationCount > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {{ notificationCount }}
              </span>
            </button>
            <div class="dropdown-menu dropdown-menu-end shadow" aria-labelledby="notificationsDropdown" style="width: 300px;">
              <h6 class="dropdown-header">Notificaciones</h6>
              <div v-if="notifications.length === 0" class="dropdown-item-text text-center py-3">
                <BellOff class="text-muted" />
                <p class="mb-0 small">No tienes notificaciones nuevas</p>
              </div>
              <template v-else>
                <a href="#" class="dropdown-item py-2" v-for="(notification, index) in notifications" :key="index">
                  <div class="d-flex align-items-center">
                    <div class="flex-shrink-0">
                      <i :class="`bi ${notification.icon} text-${notification.type} bg-${notification.type} bg-opacity-10 p-2 rounded-circle`"></i>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <p class="mb-0 small fw-medium">{{ notification.title }}</p>
                      <p class="mb-0 small text-muted">{{ notification.time }}</p>
                    </div>
                  </div>
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item text-center small text-primary">Ver todas las notificaciones</a>
              </template>
            </div>
          </div>
        </div>
      </header>
      
      <!-- Page Content -->
      <div class="content p-4">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import SidebarNav from '@/components/admin/SidebarNav.vue';

// Importar componentes de Lucide específicos
import { Menu, Bell, BellOff, Plus, Building, UserPlus, Gift } from 'lucide-vue-next';

// Referencia al componente SidebarNav
const sidebarNavRef = ref(null);

const router = useRouter();
const authStore = useAuthStore();

// Estado para notificaciones
const notifications = ref([]);
const notificationCount = computed(() => notifications.value.length);

// Título de la página actual
const pageTitle = computed(() => {
  const route = router.currentRoute.value;
  
  // Mapeo de rutas a títulos
  const routeTitles = {
    '/admin': 'Panel Principal',
    '/admin/businesses': 'Negocios',
    '/admin/businesses/new': 'Nuevo Negocio',
    '/admin/users': 'Usuarios',
    '/admin/users/new': 'Nuevo Usuario',
    '/admin/clients': 'Gestión de Clientes',
    '/admin/client-consumption': 'Consumos de Clientes',
    '/admin/statistics': 'Análisis de Datos',
    '/admin/profile': 'Mi Perfil',
    '/admin/business/dashboard': 'Mi Negocio',
    '/admin/business/clients': 'Clientes',
    '/admin/business/transactions': 'Transacciones',
    '/admin/business/rewards': 'Premios',
    '/admin/business/rewards/new': 'Nuevo Premio'
  };
  
  // Para rutas de edición
  if (route.path.includes('/edit')) {
    if (route.path.includes('/businesses/')) {
      return 'Editar Negocio';
    } else if (route.path.includes('/users/')) {
      return 'Editar Usuario';
    } else if (route.path.includes('/rewards/')) {
      return 'Editar Premio';
    } else if (route.path.includes('/clients/')) {
      return 'Editar Cliente';
    }
  }
  
  // Para rutas de detalle de cliente
  if (route.path.match(/\/admin\/clients\/[^/]+$/) && !route.path.includes('/edit')) {
    return 'Detalle de Cliente';
  }
  
  return routeTitles[route.path] || 'Panel de Administración';
});

// Descripción de la página actual
const pageDescription = computed(() => {
  const route = router.currentRoute.value;
  
  // Mapeo de rutas a descripciones
  const routeDescriptions = {
    '/admin': 'Resumen general del sistema',
    '/admin/businesses': 'Administración de negocios registrados',
    '/admin/businesses/new': 'Crear un nuevo negocio en el sistema',
    '/admin/users': 'Administración de usuarios del sistema',
    '/admin/users/new': 'Crear un nuevo usuario administrador',
    '/admin/clients': 'Gestión y exportación de datos de clientes',
    '/admin/client-consumption': 'Seguimiento de compras y consumos de clientes',
    '/admin/statistics': 'Visualización y análisis detallado de datos',
    '/admin/profile': 'Información de tu perfil de usuario',
    '/admin/business/dashboard': 'Resumen general de tu negocio',
    '/admin/business/clients': 'Administración de clientes de tu negocio',
    '/admin/business/transactions': 'Historial de transacciones de tu negocio',
    '/admin/business/rewards': 'Administración de premios para clientes',
    '/admin/business/rewards/new': 'Crear un nuevo premio para clientes'
  };
  
  // Para rutas de edición
  if (route.path.includes('/edit')) {
    if (route.path.includes('/businesses/')) {
      return 'Modificar información del negocio';
    } else if (route.path.includes('/users/')) {
      return 'Modificar información del usuario';
    } else if (route.path.includes('/rewards/')) {
      return 'Modificar información del premio';
    }
  }
  
  return routeDescriptions[route.path] || '';
});

// Botón de acción principal (visible solo en ciertas páginas)
const showActionButton = computed(() => {
  const route = router.currentRoute.value;
  
  // Rutas donde mostrar el botón de acción
  return [
    '/admin/businesses',
    '/admin/users',
    '/admin/business/rewards'
  ].includes(route.path);
});

// Texto del botón de acción
const actionButtonText = computed(() => {
  const route = router.currentRoute.value;
  
  if (route.path === '/admin/businesses') return 'Nuevo Negocio';
  if (route.path === '/admin/users') return 'Nuevo Usuario';
  if (route.path === '/admin/business/rewards') return 'Nuevo Premio';
  
  return 'Agregar';
});

// Icono del botón de acción
const actionButtonIcon = computed(() => {
  const route = router.currentRoute.value;
  
  if (route.path === '/admin/businesses') return Building;
  if (route.path === '/admin/users') return UserPlus;
  if (route.path === '/admin/business/rewards') return Gift;
  
  return Plus;
});

// Cerrar sesión
async function handleLogout() {
  try {
    await authStore.signOut();
    router.push('/login');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
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

// Alternar menú móvil
function toggleMobileMenu() {
  if (sidebarNavRef.value) {
    sidebarNavRef.value.openMobileMenu();
  }
}

// Manejar el botón de acción principal
function handleActionButton() {
  const route = router.currentRoute.value;
  
  // Redirigir a la página correspondiente según la ruta actual
  if (route.path === '/admin/businesses') {
    router.push('/admin/businesses/new');
  } else if (route.path === '/admin/users') {
    router.push('/admin/users/new');
  } else if (route.path === '/admin/business/rewards') {
    router.push('/admin/business/rewards/new');
  }
}

// Inicializar
onMounted(() => {
  // Ejemplo de notificaciones (puedes eliminar esto en producción)
  // En un caso real, estas vendrían de Firestore o de algún servicio
  /*
  notifications.value = [
    {
      title: 'Nuevo cliente registrado',
      time: 'Hace 5 minutos',
      icon: 'bi-person-plus',
      type: 'success'
    },
    {
      title: 'Nueva compra registrada',
      time: 'Hace 30 minutos',
      icon: 'bi-receipt',
      type: 'primary'
    }
  ];
  */
});
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background-color: #f8f9fa;
}

.main-content {
  flex: 1;
  margin-left: 250px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
}

/* Cuando el sidebar está colapsado */
:deep(.sidebar-collapsed) + .main-content {
  margin-left: 70px;
}

.header {
  border-bottom: 1px solid #e9ecef;
  z-index: 1020;
}

.content {
  flex: 1;
}

.avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.dropdown-item-text {
  padding: 0.5rem 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }
  
  :deep(.sidebar) {
    transform: translateX(-100%);
    z-index: 1050;
  }
  
  :deep(.sidebar-collapsed) {
    transform: translateX(-100%);
  }
  
  :deep(.sidebar-collapsed) + .main-content {
    margin-left: 0;
  }
}
</style>