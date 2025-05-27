<!-- src/views/admin/BusinessList.vue -->
<template>
  <div class="container-fluid">

    <!-- Filtros -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label for="searchInput" class="form-label">Buscar</label>
                <div class="input-group">
                  <span class="input-group-text"><Search size="18" /></span>
                  <input type="text" class="form-control" id="searchInput" v-model="searchTerm"
                    placeholder="Buscar por nombre, RUC o ciudad">
                </div>
              </div>
              <div class="col-md-3">
                <label for="cityFilter" class="form-label">Ciudad</label>
                <select class="form-select" id="cityFilter" v-model="cityFilter">
                  <option value="">Todas las ciudades</option>
                  <option v-for="city in availableCities" :key="city" :value="city">{{ city }}</option>
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
                  <XCircle class="me-1" size="18" /> Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de negocios -->
    <div class="row">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div v-if="loading" class="p-5 text-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <p class="mt-2 text-muted">Cargando negocios...</p>
            </div>
            <div v-else-if="filteredBusinesses.length === 0" class="p-5 text-center">
              <Building class="text-muted" size="48" />
              <p class="mt-3 text-muted">No se encontraron negocios con los filtros seleccionados</p>
              <button class="btn btn-outline-primary mt-2" @click="resetFilters">
                Limpiar filtros
              </button>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col" class="border-0">Negocio</th>
                    <th scope="col" class="border-0">Contacto</th>
                    <th scope="col" class="border-0">Ciudad</th>
                    <th scope="col" class="border-0">Estado</th>
                    <th scope="col" class="border-0">Clientes</th>
                    <th scope="col" class="border-0 text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="business in filteredBusinesses" :key="business.id">
                    <td>
                      <div class="d-flex align-items-center">
                        <div class="avatar-circle bg-primary bg-opacity-10 text-primary me-3">
                          {{ getInitials(business.name) }}
                        </div>
                        <div>
                          <h6 class="mb-0">{{ business.name }}</h6>
                          <small class="text-muted">{{ business.ruc }}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div v-if="business.email">{{ business.email }}</div>
                        <div v-if="business.phone" class="text-muted">
                          <Phone class="me-1" size="14" /> {{ business.phone }}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge bg-light text-dark">
                        <MapPin class="me-1" size="14" /> {{ business.city }}
                      </span>
                    </td>
                    <td>
                      <span class="badge" :class="business.disabled ? 'bg-danger' : 'bg-success'">
                        {{ business.disabled ? 'Inactivo' : 'Activo' }}
                      </span>
                    </td>
                    <td>
                      <span class="badge bg-info text-white">
                        {{ business.clientCount || 0 }} clientes
                      </span>
                    </td>
                    <td class="text-end">
                      <div class="btn-group btn-group-sm">
                        <router-link :to="`/admin/businesses/${business.id}/edit`" class="btn btn-outline-primary">
                          <Pencil size="16" />
                        </router-link>
                        <button class="btn" :class="business.disabled ? 'btn-outline-success' : 'btn-outline-danger'"
                          @click="toggleBusinessStatus(business)">
                          <component :is="business.disabled ? CheckCircle : XCircleIcon" size="16" />
                        </button>
                        <button class="btn btn-outline-info" @click="viewBusinessDetails(business)">
                          <Eye size="16" />
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
              <span class="text-muted">Mostrando {{ filteredBusinesses.length }} de {{ businesses.length }} negocios</span>
            </div>
            <div>
              <button class="btn btn-sm btn-outline-primary" @click="loadBusinesses">
                <RefreshCw class="me-1" size="14" /> Actualizar
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

    <!-- Modal de detalles del negocio -->
    <div class="modal fade" id="businessDetailsModal" tabindex="-1" aria-labelledby="businessDetailsModalLabel"
      aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="businessDetailsModalLabel">Detalles del Negocio</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-if="selectedBusiness">
              <div class="row mb-4">
                <div class="col-md-6">
                  <h6 class="text-muted mb-2">Información general</h6>
                  <p class="mb-1"><strong>Nombre:</strong> {{ selectedBusiness.name }}</p>
                  <p class="mb-1"><strong>RUC:</strong> {{ selectedBusiness.ruc }}</p>
                  <p class="mb-1"><strong>Ciudad:</strong> {{ selectedBusiness.city }}</p>
                  <p class="mb-1"><strong>Dirección:</strong> {{ selectedBusiness.address || 'No disponible' }}</p>
                </div>
                <div class="col-md-6">
                  <h6 class="text-muted mb-2">Contacto</h6>
                  <p class="mb-1"><strong>Email:</strong> {{ selectedBusiness.email || 'No disponible' }}</p>
                  <p class="mb-1"><strong>Teléfono:</strong> {{ selectedBusiness.phone || 'No disponible' }}</p>
                  <p class="mb-1"><strong>Administrador:</strong> {{ selectedBusiness.adminEmail || 'No asignado' }}</p>
                  <p class="mb-1"><strong>Fecha de registro:</strong> {{ formatDate(selectedBusiness.createdAt) }}</p>
                </div>
              </div>

              <div class="row">
                <div class="col-12">
                  <h6 class="text-muted mb-2">Configuración de fidelización</h6>
                  <div class="card bg-light">
                    <div class="card-body">
                      <div class="row">
                        <div class="col-md-4">
                          <p class="mb-1"><strong>Compras requeridas:</strong> {{ selectedBusiness.config?.purchasesRequired || 10 }}</p>
                        </div>
                        <div class="col-md-4">
                          <p class="mb-1"><strong>Días de expiración:</strong> {{ selectedBusiness.config?.expirationDays || 90 }}</p>
                        </div>
                        <div class="col-md-4">
                          <p class="mb-1"><strong>Recompensa:</strong> {{ selectedBusiness.config?.reward || 'No definida' }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            <router-link :to="`/admin/businesses/${selectedBusiness?.id}/edit`" class="btn btn-primary">
              <Pencil class="me-1" size="14" /> Editar negocio
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { collection, getDocs, updateDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuthStore } from '@/stores/auth';

// Importar componentes de Lucide
import { Search, XCircle, Building, Phone, MapPin, Pencil, CheckCircle, XCircle as XCircleIcon, Eye, RefreshCw } from 'lucide-vue-next';

const authStore = useAuthStore();
const businesses = ref([]);
const loading = ref(true);

// Filtros
const searchTerm = ref('');
const cityFilter = ref('');
const statusFilter = ref('');

// Modal
const modalTitle = ref('');
const modalMessage = ref('');
const selectedBusiness = ref(null);
let confirmModal;
let businessDetailsModal;
let currentAction = '';

// Ciudades disponibles (se calculará a partir de los negocios cargados)
const availableCities = computed(() => {
  const cities = new Set(businesses.value.map(business => business.city).filter(Boolean));
  return Array.from(cities).sort();
});

// Negocios filtrados
const filteredBusinesses = computed(() => {
  return businesses.value.filter(business => {
    // Filtro de búsqueda
    const searchMatch = !searchTerm.value || 
      (business.name && business.name.toLowerCase().includes(searchTerm.value.toLowerCase())) ||
      (business.ruc && business.ruc.includes(searchTerm.value)) ||
      (business.city && business.city.toLowerCase().includes(searchTerm.value.toLowerCase()));
    
    // Filtro de ciudad
    const cityMatch = !cityFilter.value || business.city === cityFilter.value;
    
    // Filtro de estado
    const statusMatch = !statusFilter.value || 
      (statusFilter.value === 'active' && !business.disabled) ||
      (statusFilter.value === 'inactive' && business.disabled);
    
    return searchMatch && cityMatch && statusMatch;
  });
});

// Cargar negocios
async function loadBusinesses() {
  loading.value = true;
  try {
    const businessesQuery = query(collection(db, 'businesses'));
    const snapshot = await getDocs(businessesQuery);
    
    // Obtener información adicional para cada negocio
    const businessesWithClientCount = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const business = {
        id: docSnap.id,
        ...docSnap.data(),
        clientCount: 0 // Inicializar contador de clientes
      };
      
      // Contar clientes del negocio (en una app real, esto podría venir de una colección específica)
      try {
        const clientsQuery = query(collection(db, 'business_customers', business.id, 'customers'));
        const clientsSnapshot = await getDocs(clientsQuery);
        business.clientCount = clientsSnapshot.size;
      } catch (error) {
        console.error(`Error al obtener clientes para ${business.name}:`, error);
      }
      
      // Si el negocio tiene un adminId, obtener su email
      if (business.adminId) {
        try {
          const adminDoc = await getDoc(doc(db, 'users', business.adminId));
          if (adminDoc.exists()) {
            business.adminEmail = adminDoc.data().email;
          }
        } catch (error) {
          console.error(`Error al obtener admin para ${business.name}:`, error);
        }
      }
      
      return business;
    }));
    
    businesses.value = businessesWithClientCount;
  } catch (error) {
    console.error('Error al cargar negocios:', error);
  } finally {
    loading.value = false;
  }
}

// Cambiar estado de negocio
function toggleBusinessStatus(business) {
  selectedBusiness.value = business;
  const newStatus = !business.disabled;
  
  modalTitle.value = newStatus ? 'Desactivar Negocio' : 'Activar Negocio';
  modalMessage.value = newStatus
    ? `¿Estás seguro de que deseas desactivar el negocio ${business.name}?`
    : `¿Estás seguro de que deseas activar el negocio ${business.name}?`;
  
  currentAction = 'toggleStatus';
  confirmModal.show();
}

// Ver detalles del negocio
function viewBusinessDetails(business) {
  selectedBusiness.value = business;
  businessDetailsModal.show();
}

// Confirmar acción
async function confirmAction() {
  if (!selectedBusiness.value) return;
  
  try {
    if (currentAction === 'toggleStatus') {
      const newStatus = !selectedBusiness.value.disabled;
      await updateDoc(doc(db, 'businesses', selectedBusiness.value.id), {
        disabled: newStatus
      });
      
      // Actualizar en la lista local
      const index = businesses.value.findIndex(b => b.id === selectedBusiness.value.id);
      if (index !== -1) {
        businesses.value[index].disabled = newStatus;
      }
      
      alert(`Negocio ${newStatus ? 'desactivado' : 'activado'} correctamente`);
    }
    confirmModal.hide();
  } catch (error) {
    console.error('Error al realizar la acción:', error);
    alert('Error al realizar la acción');
  }
}

// Resetear filtros
function resetFilters() {
  searchTerm.value = '';
  cityFilter.value = '';
  statusFilter.value = '';
}

// Formatear fecha
function formatDate(timestamp) {
  if (!timestamp) return 'No disponible';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Obtener iniciales
function getInitials(name) {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

onMounted(() => {
  // Inicializar modales
  confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
  businessDetailsModal = new bootstrap.Modal(document.getElementById('businessDetailsModal'));
  
  // Cargar negocios
  loadBusinesses();
});
</script>

<style scoped>
.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}
</style>