<!-- src/views/admin/Profile.vue -->
<template>
  <div class="container-fluid">
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <h1 class="h3 mb-0">Mi Perfil</h1>
            <p class="text-muted">Gestiona tu información personal y configuración de cuenta</p>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-4 mb-4">
        <!-- Tarjeta de perfil -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body text-center">
            <div class="avatar-circle bg-primary bg-opacity-10 text-primary mx-auto mb-3">
              {{ getInitials(user.displayName || user.email) }}
            </div>
            <h5 class="mb-1">{{ user.displayName || 'Sin nombre' }}</h5>
            <p class="text-muted mb-3">{{ user.email }}</p>
            
            <div class="d-flex justify-content-center mb-3">
              <span class="badge bg-primary me-2">
                {{ getRoleLabel(user.role) }}
              </span>
              <span v-if="user.businessName" class="badge bg-info">
                {{ user.businessName }}
              </span>
            </div>
            
            <div class="d-grid">
              <button class="btn btn-outline-primary" @click="showChangePasswordModal">
                <i class="bi bi-key me-2"></i> Cambiar contraseña
              </button>
            </div>
          </div>
          <div class="card-footer bg-white">
            <div class="d-flex justify-content-between text-muted">
              <small>Miembro desde: {{ formatDate(user.createdAt) }}</small>
              <small>Última conexión: {{ formatDate(user.lastLogin) }}</small>
            </div>
          </div>
        </div>
        
        <!-- Tarjeta de configuración rápida -->
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white">
            <h5 class="mb-0">Configuración rápida</h5>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <h6 class="mb-0">Notificaciones por email</h6>
                  <small class="text-muted">Recibir alertas y notificaciones</small>
                </div>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="emailNotifications" v-model="settings.emailNotifications">
                </div>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <h6 class="mb-0">Autenticación de dos factores</h6>
                  <small class="text-muted">Aumenta la seguridad de tu cuenta</small>
                </div>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="twoFactorAuth" v-model="settings.twoFactorAuth">
                </div>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <h6 class="mb-0">Tema oscuro</h6>
                  <small class="text-muted">Cambiar apariencia de la interfaz</small>
                </div>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="darkMode" v-model="settings.darkMode">
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer bg-white">
            <button class="btn btn-primary w-100" @click="saveSettings">
              <i class="bi bi-save me-2"></i> Guardar configuración
            </button>
          </div>
        </div>
      </div>
      
      <div class="col-lg-8">
        <!-- Formulario de perfil -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-white">
            <h5 class="mb-0">Información personal</h5>
          </div>
          <div class="card-body">
            <form @submit.prevent="saveProfile">
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label for="displayName" class="form-label">Nombre completo</label>
                  <input type="text" class="form-control" id="displayName" v-model="profile.displayName">
                </div>
                <div class="col-md-6">
                  <label for="email" class="form-label">Email</label>
                  <input type="email" class="form-control" id="email" v-model="profile.email" disabled>
                  <div class="form-text">El email no se puede modificar</div>
                </div>
              </div>
              
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label for="phone" class="form-label">Teléfono</label>
                  <input type="tel" class="form-control" id="phone" v-model="profile.phone">
                </div>
                <div class="col-md-6">
                  <label for="language" class="form-label">Idioma preferido</label>
                  <select class="form-select" id="language" v-model="profile.language">
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                  </select>
                </div>
              </div>
              
              <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  <span v-if="saving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <!-- Actividad reciente -->
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white">
            <h5 class="mb-0">Actividad reciente</h5>
          </div>
          <div class="card-body p-0">
            <div v-if="loading" class="p-4 text-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            <div v-else-if="activities.length === 0" class="p-4 text-center">
              <p class="text-muted mb-0">No hay actividades recientes</p>
            </div>
            <div v-else class="list-group list-group-flush">
              <div v-for="(activity, index) in activities" :key="index" class="list-group-item">
                <div class="d-flex">
                  <div class="activity-icon me-3">
                    <i :class="getActivityIcon(activity.type)"></i>
                  </div>
                  <div class="flex-grow-1">
                    <div class="d-flex justify-content-between">
                      <h6 class="mb-1">{{ activity.title }}</h6>
                      <small class="text-muted">{{ formatDate(activity.timestamp) }}</small>
                    </div>
                    <p class="mb-1">{{ activity.description }}</p>
                    <small v-if="activity.details" class="text-muted">{{ activity.details }}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer bg-white text-center">
            <button class="btn btn-sm btn-outline-primary" @click="loadMoreActivities" v-if="activities.length > 0">
              Cargar más actividades
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para cambiar contraseña -->
    <div class="modal fade" id="changePasswordModal" tabindex="-1" aria-labelledby="changePasswordModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="changePasswordModalLabel">Cambiar contraseña</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="changePassword">
              <div class="mb-3">
                <label for="currentPassword" class="form-label">Contraseña actual</label>
                <input type="password" class="form-control" id="currentPassword" v-model="passwordData.currentPassword" required>
              </div>
              <div class="mb-3">
                <label for="newPassword" class="form-label">Nueva contraseña</label>
                <input type="password" class="form-control" id="newPassword" v-model="passwordData.newPassword" required minlength="6">
                <div class="form-text">La contraseña debe tener al menos 6 caracteres</div>
              </div>
              <div class="mb-3">
                <label for="confirmPassword" class="form-label">Confirmar nueva contraseña</label>
                <input type="password" class="form-control" id="confirmPassword" v-model="passwordData.confirmPassword" required minlength="6">
                <div class="form-text text-danger" v-if="passwordsDoNotMatch">
                  Las contraseñas no coinciden
                </div>
              </div>
              <div class="d-grid">
                <button type="submit" class="btn btn-primary" :disabled="changingPassword || passwordsDoNotMatch">
                  <span v-if="changingPassword" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Cambiar contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '@/firebase';
import { useAuthStore } from '@/stores/auth';

const auth = getAuth();
const authStore = useAuthStore();

// Estado
const loading = ref(true);
const saving = ref(false);
const changingPassword = ref(false);
let changePasswordModal = null;

// Datos del usuario
const user = ref({
  displayName: '',
  email: '',
  phone: '',
  role: '',
  businessName: '',
  createdAt: null,
  lastLogin: null
});

// Perfil para editar
const profile = ref({
  displayName: '',
  email: '',
  phone: '',
  language: 'es'
});

// Configuración
const settings = ref({
  emailNotifications: true,
  twoFactorAuth: false,
  darkMode: false
});

// Datos para cambio de contraseña
const passwordData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// Actividades recientes
const activities = ref([]);

// Validación de contraseñas
const passwordsDoNotMatch = computed(() => {
  return passwordData.value.newPassword !== passwordData.value.confirmPassword;
});

// Cargar datos del usuario
async function loadUserData() {
  try {
    // Obtener datos del usuario actual
    const userId = authStore.user.uid;
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      user.value = {
        displayName: userData.displayName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || '',
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin
      };
      
      // Si es admin de negocio, cargar el nombre del negocio
      if (userData.role === 'business-admin' && userData.businessId) {
        try {
          const businessDoc = await getDoc(doc(db, 'businesses', userData.businessId));
          if (businessDoc.exists()) {
            user.value.businessName = businessDoc.data().name;
          }
        } catch (error) {
          console.error('Error al cargar negocio:', error);
        }
      }
      
      // Inicializar perfil
      profile.value = {
        displayName: user.value.displayName,
        email: user.value.email,
        phone: user.value.phone,
        language: userData.language || 'es'
      };
      
      // Inicializar configuración
      settings.value = {
        emailNotifications: userData.settings?.emailNotifications !== false,
        twoFactorAuth: userData.settings?.twoFactorAuth === true,
        darkMode: userData.settings?.darkMode === true
      };
    }
  } catch (error) {
    console.error('Error al cargar datos del usuario:', error);
  }
}

// Cargar actividades recientes
async function loadActivities() {
  try {
    // En una aplicación real, cargaríamos las actividades desde la base de datos
    // Por ahora, usaremos datos de ejemplo
    activities.value = [
      {
        type: 'login',
        title: 'Inicio de sesión',
        description: 'Has iniciado sesión en el sistema',
        timestamp: new Date(Date.now() - 3600000) // 1 hora atrás
      },
      {
        type: 'profile',
        title: 'Actualización de perfil',
        description: 'Has actualizado tu información de perfil',
        timestamp: new Date(Date.now() - 86400000) // 1 día atrás
      },
      {
        type: 'transaction',
        title: 'Nueva transacción',
        description: 'Has registrado una nueva transacción',
        details: 'Cliente: Juan Pérez, Puntos: 10',
        timestamp: new Date(Date.now() - 172800000) // 2 días atrás
      }
    ];
  } catch (error) {
    console.error('Error al cargar actividades:', error);
  } finally {
    loading.value = false;
  }
}

// Cargar más actividades
function loadMoreActivities() {
  // En una aplicación real, cargaríamos más actividades desde la base de datos
  // Por ahora, simularemos la carga de más actividades
  const moreActivities = [
    {
      type: 'reward',
      title: 'Premio canjeado',
      description: 'Un cliente ha canjeado un premio',
      details: 'Cliente: María López, Premio: Café gratis',
      timestamp: new Date(Date.now() - 259200000) // 3 días atrás
    },
    {
      type: 'client',
      title: 'Nuevo cliente',
      description: 'Se ha registrado un nuevo cliente',
      details: 'Cliente: Pedro Gómez',
      timestamp: new Date(Date.now() - 345600000) // 4 días atrás
    }
  ];
  
  activities.value = [...activities.value, ...moreActivities];
}

// Guardar perfil
async function saveProfile() {
  saving.value = true;
  try {
    const userId = authStore.user.uid;
    await updateDoc(doc(db, 'users', userId), {
      displayName: profile.value.displayName,
      phone: profile.value.phone,
      language: profile.value.language,
      updatedAt: serverTimestamp()
    });
    
    // Actualizar datos locales
    user.value.displayName = profile.value.displayName;
    user.value.phone = profile.value.phone;
    
    alert('Perfil actualizado correctamente');
  } catch (error) {
    console.error('Error al guardar perfil:', error);
    alert('Error al guardar perfil: ' + error.message);
  } finally {
    saving.value = false;
  }
}

// Guardar configuración
async function saveSettings() {
  saving.value = true;
  try {
    const userId = authStore.user.uid;
    await updateDoc(doc(db, 'users', userId), {
      'settings.emailNotifications': settings.value.emailNotifications,
      'settings.twoFactorAuth': settings.value.twoFactorAuth,
      'settings.darkMode': settings.value.darkMode,
      updatedAt: serverTimestamp()
    });
    
    alert('Configuración guardada correctamente');
    
    // Aplicar tema oscuro si está activado
    if (settings.value.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    alert('Error al guardar configuración: ' + error.message);
  } finally {
    saving.value = false;
  }
}

// Mostrar modal de cambio de contraseña
function showChangePasswordModal() {
  // Limpiar datos
  passwordData.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  // Mostrar modal
  changePasswordModal.show();
}

// Cambiar contraseña
async function changePassword() {
  if (passwordsDoNotMatch.value) {
    alert('Las contraseñas no coinciden');
    return;
  }
  
  changingPassword.value = true;
  try {
    const user = auth.currentUser;
    
    // Reautenticar al usuario
    const credential = EmailAuthProvider.credential(
      user.email,
      passwordData.value.currentPassword
    );
    await reauthenticateWithCredential(user, credential);
    
    // Cambiar contraseña
    await updatePassword(user, passwordData.value.newPassword);
    
    alert('Contraseña cambiada correctamente');
    changePasswordModal.hide();
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    
    if (error.code === 'auth/wrong-password') {
      alert('La contraseña actual es incorrecta');
    } else {
      alert('Error al cambiar contraseña: ' + error.message);
    }
  } finally {
    changingPassword.value = false;
  }
}

// Obtener iniciales
function getInitials(name) {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Obtener etiqueta de rol
function getRoleLabel(role) {
  switch (role) {
    case 'super-admin': return 'Super Admin';
    case 'business-admin': return 'Admin Negocio';
    case 'business-client': return 'Cliente';
    default: return 'Desconocido';
  }
}

// Obtener icono para actividad
function getActivityIcon(type) {
  switch (type) {
    case 'login': return 'bi bi-box-arrow-in-right text-primary';
    case 'profile': return 'bi bi-person text-success';
    case 'transaction': return 'bi bi-receipt text-info';
    case 'reward': return 'bi bi-gift text-warning';
    case 'client': return 'bi bi-person-plus text-primary';
    default: return 'bi bi-activity text-secondary';
  }
}

// Formatear fecha
function formatDate(timestamp) {
  if (!timestamp) return 'Desconocida';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(async () => {
  // Inicializar modal
  changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
  
  // Cargar datos
  await Promise.all([
    loadUserData(),
    loadActivities()
  ]);
});
</script>

<style scoped>
.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(13, 110, 253, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.activity-icon .bi-person {
  color: #198754;
}

.activity-icon .bi-receipt {
  color: #0dcaf0;
}

.activity-icon .bi-gift {
  color: #ffc107;
}

.activity-icon .bi-person-plus {
  color: #0d6efd;
}
</style>
