<!-- src/views/admin/UserList.vue -->
<template>
  <div class="container-fluid">
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h1 class="h3 mb-0">Usuarios</h1>
                <p class="text-muted">Gestión de usuarios del sistema</p>
              </div>
              <div>
                <router-link to="/admin/users/new" class="btn btn-primary">
                  <i class="bi bi-person-plus me-1"></i> Agregar Admin
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Información sobre registro de clientes -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm bg-light">
          <div class="card-body">
            <div class="d-flex align-items-center">
              <div class="rounded-circle bg-info bg-opacity-10 p-3 me-3">
                <i class="bi bi-whatsapp text-info fs-4"></i>
              </div>
              <div>
                <h5 class="mb-1">Registro de Clientes por WhatsApp</h5>
                <p class="mb-0">Los clientes se registran automáticamente al enviar fotos de sus comprobantes de pago al número de WhatsApp. No es necesario crear cuentas manualmente para ellos.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label for="searchInput" class="form-label">Buscar</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-search"></i></span>
                  <input 
                    type="text" 
                    class="form-control" 
                    id="searchInput" 
                    v-model="searchTerm" 
                    placeholder="Buscar por nombre, email o teléfono"
                  >
                </div>
              </div>
              <div class="col-md-3">
                <label for="roleFilter" class="form-label">Rol</label>
                <select class="form-select" id="roleFilter" v-model="roleFilter">
                  <option value="">Todos los roles</option>
                  <option value="super-admin">Super Admin</option>
                  <option value="business-admin">Admin de Negocio</option>
                  <option value="business-client">Cliente</option>
                </select>
              </div>
              <div class="col-md-3">
                <label for="statusFilter" class="form-label">Estado</label>
                <select class="form-select" id="statusFilter" v-model="statusFilter">
                  <option value="">Todos los estados</option>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div class="col-md-2 d-flex align-items-end">
                <button class="btn btn-outline-secondary w-100" @click="resetFilters">
                  <i class="bi bi-x-circle me-1"></i> Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de usuarios -->
    <div class="row">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div v-if="loading" class="p-5 text-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <p class="mt-2 text-muted">Cargando usuarios...</p>
            </div>
            <div v-else-if="filteredUsers.length === 0" class="p-5 text-center">
              <i class="bi bi-people text-muted display-4"></i>
              <p class="mt-3 text-muted">No se encontraron usuarios con los filtros seleccionados</p>
              <button class="btn btn-outline-primary mt-2" @click="resetFilters">
                Limpiar filtros
              </button>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col" class="border-0">Usuario</th>
                    <th scope="col" class="border-0">Contacto</th>
                    <th scope="col" class="border-0">Rol</th>
                    <th scope="col" class="border-0">Estado</th>
                    <th scope="col" class="border-0">Última conexión</th>
                    <th scope="col" class="border-0 text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in filteredUsers" :key="user.id">
                    <td>
                      <div class="d-flex align-items-center">
                        <div class="avatar-circle bg-primary bg-opacity-10 text-primary me-3">
                          {{ getInitials(user.displayName || user.phone || user.email) }}
                        </div>
                        <div>
                          <h6 class="mb-0">{{ user.displayName || 'Sin nombre' }}</h6>
                          <small v-if="user.registrationType && user.role === 'business-client'" class="badge bg-light text-dark">
                            <i class="bi bi-whatsapp text-success me-1"></i> Registrado por WhatsApp
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div v-if="user.email">{{ user.email }}</div>
                        <div v-if="user.phone" class="text-success">
                          <i class="bi bi-whatsapp me-1"></i> {{ user.phone }}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge" :class="getRoleBadgeClass(user.role)">
                        {{ getRoleLabel(user.role) }}
                      </span>
                    </td>
                    <td>
                      <span class="badge" :class="user.disabled ? 'bg-danger' : 'bg-success'">
                        {{ user.disabled ? 'Inactivo' : 'Activo' }}
                      </span>
                    </td>
                    <td>
                      {{ user.lastLogin ? formatDate(user.lastLogin) : 'Nunca' }}
                    </td>
                    <td class="text-end">
                      <div class="btn-group btn-group-sm">
                        <router-link 
                          v-if="user.role !== 'business-client'" 
                          :to="`/admin/users/${user.id}/edit`" 
                          class="btn btn-outline-primary"
                        >
                          <i class="bi bi-pencil"></i>
                        </router-link>
                        <button 
                          class="btn" 
                          :class="user.disabled ? 'btn-outline-success' : 'btn-outline-danger'"
                          @click="toggleUserStatus(user)"
                        >
                          <i class="bi" :class="user.disabled ? 'bi-check-circle' : 'bi-x-circle'"></i>
                        </button>
                        <button 
                          v-if="user.role !== 'business-client'"
                          class="btn btn-outline-secondary" 
                          @click="resetPassword(user)"
                        >
                          <i class="bi bi-key"></i>
                        </button>
                        <button 
                          v-if="user.role === 'business-client'"
                          class="btn btn-outline-info" 
                          @click="viewClientDetails(user)"
                        >
                          <i class="bi bi-eye"></i>
                        </button>
                        <button 
                          v-if="user.role === 'business-client'"
                          class="btn btn-outline-success" 
                          @click="sendWhatsAppMessage(user)"
                        >
                          <i class="bi bi-whatsapp"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer bg-white d-flex justify-content-between align-items-center">
            <div>
              <span class="text-muted">Mostrando {{ filteredUsers.length }} de {{ users.length }} usuarios</span>
            </div>
            <div>
              <button class="btn btn-sm btn-outline-primary" @click="loadUsers">
                <i class="bi bi-arrow-clockwise me-1"></i> Actualizar
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
            <h5 class="modal-title" id="confirmModalLabel">{{ modalTitle }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            {{ modalMessage }}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" @click="confirmAction">Confirmar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de detalles del cliente -->
    <div class="modal fade" id="clientDetailsModal" tabindex="-1" aria-labelledby="clientDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="clientDetailsModalLabel">Detalles del Cliente</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-if="selectedClient">
              <div class="row mb-4">
                <div class="col-md-6">
                  <h6 class="text-muted mb-2">Información de contacto</h6>
                  <p class="mb-1"><strong>Teléfono:</strong> {{ selectedClient.phone }}</p>
                  <p class="mb-1"><strong>Nombre:</strong> {{ selectedClient.displayName || 'No disponible' }}</p>
                  <p class="mb-1"><strong>Email:</strong> {{ selectedClient.email || 'No disponible' }}</p>
                  <p class="mb-1"><strong>Fecha de registro:</strong> {{ formatDate(selectedClient.createdAt) }}</p>
                </div>
                <div class="col-md-6">
                  <h6 class="text-muted mb-2">Estadísticas</h6>
                  <p class="mb-1"><strong>Total de consumos:</strong> {{ selectedClient.totalTransactions || 0 }}</p>
                  <p class="mb-1"><strong>Negocios visitados:</strong> {{ selectedClient.businessesCount || 0 }}</p>
                  <p class="mb-1"><strong>Premios canjeados:</strong> {{ selectedClient.redeemedRewards || 0 }}</p>
                  <p class="mb-1"><strong>Última actividad:</strong> {{ formatDate(selectedClient.lastActivity) }}</p>
                </div>
              </div>

              <h6 class="text-muted mb-3">Negocios y puntos</h6>
              <div class="table-responsive">
                <table class="table table-sm table-hover">
                  <thead class="table-light">
                    <tr>
                      <th>Negocio</th>
                      <th class="text-center">Puntos</th>
                      <th class="text-center">Consumos</th>
                      <th class="text-center">Último consumo</th>
                      <th class="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="business in selectedClient.businesses" :key="business.id">
                      <td>{{ business.name }}</td>
                      <td class="text-center">{{ business.points }}</td>
                      <td class="text-center">{{ business.transactions }}</td>
                      <td class="text-center">{{ formatDate(business.lastTransaction) }}</td>
                      <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary" @click="viewLoyaltyCard(selectedClient, business)">
                          <i class="bi bi-credit-card me-1"></i> Ver tarjeta
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            <button type="button" class="btn btn-success" @click="sendWhatsAppMessage(selectedClient)">
              <i class="bi bi-whatsapp me-1"></i> Enviar mensaje
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de envío de mensaje de WhatsApp -->
    <div class="modal fade" id="whatsappModal" tabindex="-1" aria-labelledby="whatsappModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="whatsappModalLabel">Enviar mensaje por WhatsApp</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-if="selectedClient">
              <p>Enviar mensaje a: <strong>{{ selectedClient.phone }}</strong></p>
              <div class="mb-3">
                <label for="messageTemplate" class="form-label">Plantilla</label>
                <select class="form-select" id="messageTemplate" v-model="selectedTemplate" @change="applyTemplate">
                  <option value="">Seleccionar plantilla</option>
                  <option value="welcome">Bienvenida</option>
                  <option value="loyalty_card">Enviar tarjeta de fidelidad</option>
                  <option value="points_update">Actualización de puntos</option>
                  <option value="reward_available">Premio disponible</option>
                  <option value="custom">Mensaje personalizado</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="whatsappMessage" class="form-label">Mensaje</label>
                <textarea 
                  class="form-control" 
                  id="whatsappMessage" 
                  v-model="whatsappMessage" 
                  rows="5" 
                  required
                ></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-success" @click="confirmSendWhatsAppMessage">
              <i class="bi bi-whatsapp me-1"></i> Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const users = ref([]);
const loading = ref(true);

// Filtros
const searchTerm = ref('');
const roleFilter = ref('');
const statusFilter = ref('');

// Modal
const modalTitle = ref('');
const modalMessage = ref('');
let confirmModal = null;
let clientDetailsModal = null;
let whatsappModal = null;
let currentAction = null;
let selectedUser = null;

// Cliente seleccionado para ver detalles
const selectedClient = ref(null);

// WhatsApp
const selectedTemplate = ref('');
const whatsappMessage = ref('');

// Usuarios filtrados
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    // Filtro de búsqueda
    const searchMatch = !searchTerm.value || 
      (user.displayName && user.displayName.toLowerCase().includes(searchTerm.value.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.value.toLowerCase())) ||
      (user.phone && user.phone.includes(searchTerm.value));
    
    // Filtro de rol
    const roleMatch = !roleFilter.value || user.role === roleFilter.value;
    
    // Filtro de estado
    const statusMatch = !statusFilter.value || 
      (statusFilter.value === 'active' && !user.disabled) ||
      (statusFilter.value === 'inactive' && user.disabled);
    
    return searchMatch && roleMatch && statusMatch;
  });
});

// Cargar usuarios
async function loadUsers() {
  loading.value = true;
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    users.value = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      registrationType: doc.data().phone ? 'whatsapp' : 'email'
    }));
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
  } finally {
    loading.value = false;
  }
}

// Cambiar estado de usuario
function toggleUserStatus(user) {
  selectedUser = user;
  const newStatus = !user.disabled;
  
  modalTitle.value = newStatus ? 'Desactivar Usuario' : 'Activar Usuario';
  modalMessage.value = newStatus 
    ? `¿Estás seguro de que deseas desactivar al usuario ${user.displayName || user.phone || user.email}?` 
    : `¿Estás seguro de que deseas activar al usuario ${user.displayName || user.phone || user.email}?`;
  
  currentAction = 'toggleStatus';
  confirmModal.show();
}

// Resetear contraseña
function resetPassword(user) {
  selectedUser = user;
  modalTitle.value = 'Resetear Contraseña';
  modalMessage.value = `¿Estás seguro de que deseas enviar un correo para resetear la contraseña de ${user.displayName || user.email}?`;
  currentAction = 'resetPassword';
  confirmModal.show();
}

// Ver detalles del cliente
async function viewClientDetails(user) {
  selectedClient.value = {
    ...user,
    totalTransactions: 0,
    businessesCount: 0,
    redeemedRewards: 0,
    lastActivity: user.lastLogin || user.createdAt,
    businesses: []
  };
  
  // En una aplicación real, cargaríamos estos datos desde Firestore
  // Por ahora, usaremos datos de ejemplo
  selectedClient.value.businesses = [
    {
      id: 'business1',
      name: 'Café Delicioso',
      points: 25,
      transactions: 5,
      lastTransaction: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 días atrás
    },
    {
      id: 'business2',
      name: 'Restaurante El Sabor',
      points: 10,
      transactions: 2,
      lastTransaction: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 días atrás
    }
  ];
  
  selectedClient.value.totalTransactions = selectedClient.value.businesses.reduce((total, b) => total + b.transactions, 0);
  selectedClient.value.businessesCount = selectedClient.value.businesses.length;
  
  clientDetailsModal.show();
}

// Ver tarjeta de fidelidad
function viewLoyaltyCard(client, business) {
  // Aquí redirigimos al componente LoyaltyCard con los parámetros adecuados
  // Por ejemplo: /business-slug/phone-number
  const businessSlug = business.id; // En una aplicación real, usaríamos el slug del negocio
  const phoneNumber = client.phone.replace(/\+/g, '');
  
  window.open(`/${businessSlug}/${phoneNumber}`, '_blank');
}

// Enviar mensaje por WhatsApp
function sendWhatsAppMessage(user) {
  selectedClient.value = user;
  selectedTemplate.value = '';
  whatsappMessage.value = '';
  whatsappModal.show();
}

// Aplicar plantilla de mensaje
function applyTemplate() {
  if (!selectedTemplate.value || !selectedClient.value) return;
  
  const clientName = selectedClient.value.displayName || 'estimado cliente';
  
  switch (selectedTemplate.value) {
    case 'welcome':
      whatsappMessage.value = `¡Hola ${clientName}! Bienvenido a nuestro programa de fidelidad. Puedes consultar tus puntos y premios disponibles enviando un mensaje con la palabra "puntos".`;
      break;
    case 'loyalty_card':
      whatsappMessage.value = `¡Hola ${clientName}! Puedes ver tu tarjeta de fidelidad en el siguiente enlace: https://virtual-loyalty-card.web.app/business-id/${selectedClient.value.phone.replace(/\+/g, '')}`;
      break;
    case 'points_update':
      whatsappMessage.value = `¡Hola ${clientName}! Te informamos que has acumulado nuevos puntos en tu tarjeta de fidelidad. Envía "puntos" para consultar tu saldo actual.`;
      break;
    case 'reward_available':
      whatsappMessage.value = `¡Felicidades ${clientName}! Has acumulado suficientes puntos para canjear un premio. Visítanos pronto para disfrutar de tu recompensa.`;
      break;
    case 'custom':
      whatsappMessage.value = `¡Hola ${clientName}!`;
      break;
  }
}

// Confirmar envío de mensaje por WhatsApp
function confirmSendWhatsAppMessage() {
  if (!whatsappMessage.value || !selectedClient.value) return;
  
  // En una aplicación real, aquí enviaríamos el mensaje a través de la API de WhatsApp
  alert(`Mensaje enviado a ${selectedClient.value.phone}: ${whatsappMessage.value}`);
  whatsappModal.hide();
}

// Confirmar acción
async function confirmAction() {
  if (!selectedUser) return;
  
  try {
    if (currentAction === 'toggleStatus') {
      const newStatus = !selectedUser.disabled;
      await updateDoc(doc(db, 'users', selectedUser.id), {
        disabled: newStatus
      });
      
      // Actualizar en la lista local
      const index = users.value.findIndex(u => u.id === selectedUser.id);
      if (index !== -1) {
        users.value[index].disabled = newStatus;
      }
      
      alert(`Usuario ${newStatus ? 'desactivado' : 'activado'} correctamente`);
    } else if (currentAction === 'resetPassword') {
      // Aquí iría la lógica para resetear la contraseña
      // Normalmente se haría a través de Firebase Auth Admin SDK en el backend
      alert(`Se ha enviado un correo para resetear la contraseña a ${selectedUser.email}`);
    }
  } catch (error) {
    console.error('Error al realizar la acción:', error);
    alert('Ha ocurrido un error al realizar la acción');
  } finally {
    confirmModal.hide();
    selectedUser = null;
  }
}

// Resetear filtros
function resetFilters() {
  searchTerm.value = '';
  roleFilter.value = '';
  statusFilter.value = '';
}

// Formatear fecha
function formatDate(timestamp) {
  if (!timestamp) return 'Nunca';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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

// Obtener clase para la etiqueta de rol
function getRoleBadgeClass(role) {
  switch (role) {
    case 'super-admin': return 'bg-danger';
    case 'business-admin': return 'bg-primary';
    case 'business-client': return 'bg-success';
    default: return 'bg-secondary';
  }
}

onMounted(() => {
  // Inicializar modales
  confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
  clientDetailsModal = new bootstrap.Modal(document.getElementById('clientDetailsModal'));
  whatsappModal = new bootstrap.Modal(document.getElementById('whatsappModal'));
  
  // Cargar usuarios
  loadUsers();
});
</script>

<style scoped>
.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.table th {
  font-weight: 600;
  padding: 1rem;
}

.table td {
  padding: 0.75rem 1rem;
}
</style>
