<!-- src/views/admin/UserForm.vue -->
<template>
  <div class="container-fluid">
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h1 class="h3 mb-0">{{ isEditing ? 'Editar Usuario' : 'Crear Usuario Admin' }}</h1>
                <p class="text-muted">{{ isEditing ? 'Modifica los datos del usuario' : 'Completa el formulario para crear un nuevo usuario administrador' }}</p>
              </div>
              <div>
                <router-link to="/admin/users" class="btn btn-outline-secondary">
                  <i class="bi bi-arrow-left me-1"></i> Volver
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-8">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <form @submit.prevent="saveUser">
              <!-- Información básica -->
              <div class="mb-4">
                <h5 class="card-title">Información básica</h5>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label for="displayName" class="form-label">Nombre completo</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      id="displayName" 
                      v-model="user.displayName" 
                      :required="!isEditing"
                    >
                  </div>
                  <div class="col-md-6">
                    <label for="email" class="form-label">Email</label>
                    <input 
                      type="email" 
                      class="form-control" 
                      id="email" 
                      v-model="user.email" 
                      required
                      :disabled="isEditing"
                    >
                    <div class="form-text" v-if="isEditing">El email no se puede modificar</div>
                  </div>
                  <div class="col-md-6">
                    <label for="phone" class="form-label">Teléfono</label>
                    <input 
                      type="tel" 
                      class="form-control" 
                      id="phone" 
                      v-model="user.phone"
                    >
                  </div>
                  <div class="col-md-6">
                    <label for="role" class="form-label">Rol</label>
                    <select class="form-select" id="role" v-model="user.role" required>
                      <option value="business-admin">Admin de Negocio</option>
                      <option value="super-admin">Super Admin</option>
                    </select>
                    <div class="form-text">Los clientes se registran automáticamente a través de WhatsApp</div>
                  </div>
                </div>
              </div>

              <!-- Configuración de contraseña (solo para nuevos usuarios) -->
              <div class="mb-4" v-if="!isEditing">
                <h5 class="card-title">Contraseña</h5>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label for="password" class="form-label">Contraseña</label>
                    <div class="input-group">
                      <input 
                        :type="showPassword ? 'text' : 'password'" 
                        class="form-control" 
                        id="password" 
                        v-model="user.password" 
                        required
                        minlength="6"
                      >
                      <button 
                        class="btn btn-outline-secondary" 
                        type="button"
                        @click="showPassword = !showPassword"
                      >
                        <i class="bi" :class="showPassword ? 'bi-eye-slash' : 'bi-eye'"></i>
                      </button>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label for="confirmPassword" class="form-label">Confirmar contraseña</label>
                    <div class="input-group">
                      <input 
                        :type="showConfirmPassword ? 'text' : 'password'" 
                        class="form-control" 
                        id="confirmPassword" 
                        v-model="user.confirmPassword" 
                        required
                        minlength="6"
                      >
                      <button 
                        class="btn btn-outline-secondary" 
                        type="button"
                        @click="showConfirmPassword = !showConfirmPassword"
                      >
                        <i class="bi" :class="showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'"></i>
                      </button>
                    </div>
                    <div class="form-text text-danger" v-if="passwordsDoNotMatch">
                      Las contraseñas no coinciden
                    </div>
                  </div>
                </div>
              </div>

              <!-- Configuración de negocio (solo para admin de negocio) -->
              <div class="mb-4" v-if="user.role === 'business-admin'">
                <h5 class="card-title">Asignación de Negocio</h5>
                <div class="row g-3">
                  <div class="col-12">
                    <label for="businessId" class="form-label">Negocio</label>
                    <select class="form-select" id="businessId" v-model="user.businessId" :required="user.role === 'business-admin'">
                      <option value="">Seleccionar negocio</option>
                      <option v-for="business in businesses" :key="business.id" :value="business.id">
                        {{ business.name }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Estado del usuario (solo en edición) -->
              <div class="mb-4" v-if="isEditing">
                <h5 class="card-title">Estado de la cuenta</h5>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="userStatus" v-model="user.active">
                  <label class="form-check-label" for="userStatus">
                    {{ user.active ? 'Cuenta activa' : 'Cuenta inactiva' }}
                  </label>
                </div>
              </div>

              <!-- Botones de acción -->
              <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                <button 
                  type="button" 
                  class="btn btn-outline-secondary" 
                  @click="$router.push('/admin/users')"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  class="btn btn-primary" 
                  :disabled="loading || (passwordsDoNotMatch && !isEditing)"
                >
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ isEditing ? 'Guardar cambios' : 'Crear usuario' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-white">
            <h5 class="card-title mb-0">Información adicional</h5>
          </div>
          <div class="card-body">
            <div v-if="isEditing">
              <div class="mb-3">
                <h6 class="text-muted">Fecha de creación</h6>
                <p>{{ user.createdAt ? formatDate(user.createdAt) : 'Desconocida' }}</p>
              </div>
              <div class="mb-3">
                <h6 class="text-muted">Última conexión</h6>
                <p>{{ user.lastLogin ? formatDate(user.lastLogin) : 'Nunca' }}</p>
              </div>
            </div>
            <div v-else>
              <div class="alert alert-info mb-3">
                <i class="bi bi-info-circle me-2"></i> 
                Completa el formulario para crear un nuevo usuario administrador en el sistema.
              </div>
              
              <div class="alert alert-warning mb-3">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Al crear un usuario, se enviará un correo electrónico con las credenciales de acceso.
              </div>
              
              <div class="alert alert-success">
                <i class="bi bi-whatsapp me-2"></i>
                <strong>Registro de clientes:</strong> Los clientes finales se registran automáticamente al enviar fotos de sus comprobantes de pago por WhatsApp.
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm" v-if="isEditing">
          <div class="card-header bg-white">
            <h5 class="card-title mb-0">Acciones</h5>
          </div>
          <div class="card-body">
            <div class="d-grid gap-2">
              <button 
                type="button" 
                class="btn btn-outline-primary"
                @click="sendPasswordReset"
              >
                <i class="bi bi-key me-2"></i> Enviar correo de recuperación
              </button>
              <button 
                type="button" 
                class="btn btn-outline-danger"
                @click="confirmDelete"
              >
                <i class="bi bi-trash me-2"></i> Eliminar usuario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación -->
    <div class="modal fade" id="confirmModal" tabindex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="confirmModalLabel">Eliminar usuario</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.</p>
            <div class="alert alert-danger">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Se eliminarán todos los datos asociados a este usuario.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-danger" @click="deleteUser">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { db } from '@/firebase';

const route = useRoute();
const router = useRouter();
const auth = getAuth();

const userId = computed(() => route.params.id);
const isEditing = computed(() => !!userId.value);
const loading = ref(false);
const businesses = ref([]);

// Mostrar/ocultar contraseñas
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// Modal de confirmación
let confirmModal = null;

// Datos del usuario
const user = ref({
  displayName: '',
  email: '',
  phone: '',
  role: 'business-admin', // Por defecto, crear admin de negocio
  businessId: '',
  password: '',
  confirmPassword: '',
  active: true,
  createdAt: null,
  lastLogin: null
});

// Validación de contraseñas
const passwordsDoNotMatch = computed(() => {
  if (!user.value.password && !user.value.confirmPassword) return false;
  return user.value.password !== user.value.confirmPassword;
});

// Cargar datos del usuario (en modo edición)
async function loadUser() {
  if (!isEditing.value) return;
  
  loading.value = true;
  try {
    const userDoc = await getDoc(doc(db, 'users', userId.value));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Verificar que no sea un cliente
      if (userData.role === 'business-client') {
        alert('No se pueden editar los usuarios de tipo cliente desde este formulario.');
        router.push('/admin/users');
        return;
      }
      
      user.value = {
        displayName: userData.displayName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || 'business-admin',
        businessId: userData.businessId || '',
        active: !userData.disabled,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin
      };
    } else {
      alert('Usuario no encontrado');
      router.push('/admin/users');
    }
  } catch (error) {
    console.error('Error al cargar usuario:', error);
    alert('Error al cargar los datos del usuario');
  } finally {
    loading.value = false;
  }
}

// Cargar lista de negocios (para asignar a admin de negocio)
async function loadBusinesses() {
  try {
    const businessesSnapshot = await getDocs(collection(db, 'businesses'));
    businesses.value = businessesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error al cargar negocios:', error);
  }
}

// Guardar usuario
async function saveUser() {
  if (!isEditing.value && passwordsDoNotMatch.value) {
    alert('Las contraseñas no coinciden');
    return;
  }
  
  loading.value = true;
  try {
    if (isEditing.value) {
      // Actualizar usuario existente
      await updateDoc(doc(db, 'users', userId.value), {
        displayName: user.value.displayName,
        phone: user.value.phone,
        role: user.value.role,
        businessId: user.value.role === 'business-admin' ? user.value.businessId : null,
        disabled: !user.value.active,
        updatedAt: serverTimestamp()
      });
      
      alert('Usuario actualizado correctamente');
    } else {
      // Crear nuevo usuario
      // En una aplicación real, esto se haría desde el backend con Firebase Admin SDK
      // Aquí simularemos la creación del usuario
      
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        user.value.email, 
        user.value.password
      );
      
      // 2. Guardar datos adicionales en Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        displayName: user.value.displayName,
        email: user.value.email,
        phone: user.value.phone,
        role: user.value.role,
        businessId: user.value.role === 'business-admin' ? user.value.businessId : null,
        disabled: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      alert('Usuario creado correctamente');
    }
    
    router.push('/admin/users');
  } catch (error) {
    console.error('Error al guardar usuario:', error);
    alert(`Error: ${error.message}`);
  } finally {
    loading.value = false;
  }
}

// Enviar correo de recuperación de contraseña
async function sendPasswordReset() {
  try {
    await sendPasswordResetEmail(auth, user.value.email);
    alert(`Se ha enviado un correo de recuperación a ${user.value.email}`);
  } catch (error) {
    console.error('Error al enviar correo de recuperación:', error);
    alert(`Error: ${error.message}`);
  }
}

// Confirmar eliminación
function confirmDelete() {
  confirmModal.show();
}

// Eliminar usuario
async function deleteUser() {
  loading.value = true;
  try {
    // En una aplicación real, esto se haría desde el backend con Firebase Admin SDK
    // Aquí simularemos la eliminación del usuario
    await deleteDoc(doc(db, 'users', userId.value));
    
    confirmModal.hide();
    alert('Usuario eliminado correctamente');
    router.push('/admin/users');
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    alert(`Error: ${error.message}`);
  } finally {
    loading.value = false;
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

// Observar cambios en el rol
watch(() => user.value.role, (newRole) => {
  if (newRole !== 'business-admin') {
    user.value.businessId = '';
  }
});

onMounted(async () => {
  // Inicializar modal
  confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
  
  // Cargar datos
  await Promise.all([
    loadUser(),
    loadBusinesses()
  ]);
});
</script>

<style scoped>
.card-title {
  font-weight: 600;
  margin-bottom: 1.25rem;
}
</style>
