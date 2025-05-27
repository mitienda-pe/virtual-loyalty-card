<!-- src/views/admin/ClientList.vue -->
<template>
  <div class="container-fluid">
    <!-- Filtros y acciones -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label for="searchInput" class="form-label">Buscar Cliente</label>
                <div class="input-group">
                  <span class="input-group-text"><Search size="18" /></span>
                  <input 
                    type="text" 
                    class="form-control" 
                    id="searchInput" 
                    v-model="searchTerm" 
                    placeholder="Buscar por nombre o teléfono"
                  >
                </div>
              </div>
              <div class="col-md-3" v-if="authStore.isSuperAdmin">
                <label for="businessFilter" class="form-label">Negocio</label>
                <select class="form-select" id="businessFilter" v-model="businessFilter">
                  <option value="">Todos los negocios</option>
                  <option v-for="business in businesses" :key="business.id" :value="business.id">
                    {{ business.name }}
                  </option>
                </select>
              </div>
              <div class="col-md-3">
                <label for="activityFilter" class="form-label">Actividad</label>
                <select class="form-select" id="activityFilter" v-model="activityFilter">
                  <option value="all">Todos los clientes</option>
                  <option value="active">Activos (último mes)</option>
                  <option value="inactive">Inactivos (+30 días)</option>
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

    <!-- Acciones masivas -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-0">Clientes</h5>
              <p class="text-muted small mb-0">Total: {{ filteredClients.length }} clientes</p>
            </div>
            <div class="btn-group">
              <button class="btn btn-outline-primary" @click="exportToCSV">
                <Download size="18" class="me-1" /> Exportar CSV
              </button>
              <button class="btn btn-outline-success" @click="importModal.show()">
                <Upload size="18" class="me-1" /> Importar
              </button>
              <button class="btn btn-outline-secondary" @click="loadData">
                <RefreshCw size="18" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de clientes -->
    <div class="row">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div v-if="loading" class="p-5 text-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <p class="mt-2 text-muted">Cargando datos de clientes...</p>
            </div>
            <div v-else-if="filteredClients.length === 0" class="p-5 text-center">
              <Users class="text-muted" size="48" />
              <p class="mt-3 text-muted">No se encontraron clientes con los filtros seleccionados</p>
              <button class="btn btn-outline-primary mt-2" @click="resetFilters">
                Limpiar filtros
              </button>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col" class="border-0">Cliente</th>
                    <th scope="col" class="border-0">Contacto</th>
                    <th scope="col" class="border-0">Negocios</th>
                    <th scope="col" class="border-0">Última actividad</th>
                    <th scope="col" class="border-0">Total compras</th>
                    <th scope="col" class="border-0">Total gastado</th>
                    <th scope="col" class="border-0 text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="client in paginatedClients" :key="client.phoneNumber">
                    <td>
                      <div class="d-flex align-items-center">
                        <div class="avatar-circle bg-primary bg-opacity-10 text-primary me-3">
                          {{ getInitials(client.profile?.name || 'Cliente') }}
                        </div>
                        <div>
                          <router-link :to="`/admin/clients/${client.phoneNumber}`" class="text-decoration-none">
                            <h6 class="mb-0">{{ client.profile?.name || 'Cliente sin nombre' }}</h6>
                            <small class="text-muted">{{ client.phoneNumber }}</small>
                          </router-link>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div v-if="client.profile?.email" class="mb-1">
                        <Mail size="14" class="text-muted me-1" /> {{ client.profile.email }}
                      </div>
                      <div v-if="client.profile?.birthday" class="mb-0">
                        <Cake size="14" class="text-muted me-1" /> {{ formatDate(client.profile.birthday, false) }}
                      </div>
                    </td>
                    <td>
                      <div class="d-flex align-items-center">
                        <span class="badge bg-primary me-2">{{ Object.keys(client.businesses || {}).length }}</span>
                        <div class="business-icons">
                          <span 
                            v-for="(_, businessId) in client.businesses" 
                            :key="businessId" 
                            class="business-icon" 
                            :title="getBusinessName(businessId)"
                          >
                            {{ getBusinessInitial(businessId) }}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="d-flex align-items-center">
                        <span 
                          class="activity-indicator me-2" 
                          :class="isClientActive(client) ? 'bg-success' : 'bg-secondary'"
                        ></span>
                        {{ formatDate(client.profile?.lastActive) }}
                      </div>
                    </td>
                    <td>
                      <span class="badge bg-light text-dark">
                        {{ getTotalPurchases(client) }}
                      </span>
                    </td>
                    <td>
                      <span class="fw-bold">S/ {{ getTotalSpent(client).toFixed(2) }}</span>
                    </td>
                    <td class="text-end">
                      <div class="btn-group btn-group-sm">
                        <router-link 
                          :to="`/admin/clients/${client.phoneNumber}`" 
                          class="btn btn-outline-info"
                          title="Ver detalle"
                        >
                          <Eye size="16" />
                        </router-link>
                        <router-link 
                          :to="`/admin/clients/${client.phoneNumber}/edit`" 
                          class="btn btn-outline-primary"
                          title="Editar cliente"
                        >
                          <Pencil size="16" />
                        </router-link>
                        <button 
                          class="btn btn-outline-success" 
                          @click="sendWhatsApp(client)"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle size="16" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- Paginación -->
          <div class="card-footer bg-white border-0 py-3" v-if="filteredClients.length > 0">
            <div class="d-flex justify-content-between align-items-center">
              <div class="text-muted small">
                Mostrando {{ paginatedClients.length }} de {{ filteredClients.length }} clientes
              </div>
              <nav aria-label="Paginación">
                <ul class="pagination pagination-sm mb-0">
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <button class="page-link" @click="currentPage = 1">
                      <ChevronsLeft size="16" />
                    </button>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <button class="page-link" @click="currentPage--">
                      <ChevronLeft size="16" />
                    </button>
                  </li>
                  <li class="page-item disabled">
                    <span class="page-link">{{ currentPage }} / {{ totalPages }}</span>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                    <button class="page-link" @click="currentPage++">
                      <ChevronRight size="16" />
                    </button>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                    <button class="page-link" @click="currentPage = totalPages">
                      <ChevronsRight size="16" />
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para importar clientes -->
    <div class="modal fade" id="importModal" tabindex="-1" aria-labelledby="importModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="importModalLabel">Importar Clientes</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="csvFile" class="form-label">Archivo CSV</label>
              <input type="file" class="form-control" id="csvFile" accept=".csv" @change="handleFileUpload">
              <div class="form-text">
                El archivo debe tener las columnas: phoneNumber, name, email, birthday
              </div>
            </div>
            <div class="alert alert-info">
              <Info size="18" class="me-2" />
              Los clientes existentes serán actualizados con la información del archivo.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" @click="importCSV" :disabled="!csvFile">
              <Upload size="18" class="me-1" /> Importar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para editar cliente -->
    <div class="modal fade" id="editModal" tabindex="-1" aria-labelledby="editModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editModalLabel">Editar Cliente</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-if="selectedClient">
              <div class="mb-3">
                <label for="clientName" class="form-label">Nombre</label>
                <input type="text" class="form-control" id="clientName" v-model="selectedClient.profile.name">
              </div>
              <div class="mb-3">
                <label for="clientEmail" class="form-label">Email</label>
                <input type="email" class="form-control" id="clientEmail" v-model="selectedClient.profile.email">
              </div>
              <div class="mb-3">
                <label for="clientBirthday" class="form-label">Fecha de cumpleaños</label>
                <input type="date" class="form-control" id="clientBirthday" v-model="selectedClient.profile.birthday">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" @click="saveClient">
              <Save size="18" class="me-1" /> Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { collection, getDocs, doc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuthStore } from '@/stores/auth';
import * as bootstrap from 'bootstrap';
import Papa from 'papaparse';

// Importar componentes de Lucide
import { 
  Search, XCircle, Users, Eye, Pencil, MessageCircle, Download, Upload, RefreshCw,
  Mail, Cake, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, Save
} from 'lucide-vue-next';

const authStore = useAuthStore();

// Estado
const clients = ref([]);
const businesses = ref([]);
const loading = ref(true);
const searchTerm = ref('');
const businessFilter = ref('');
const activityFilter = ref('all');
const currentPage = ref(1);
const itemsPerPage = ref(10);
const csvFile = ref(null);
const selectedClient = ref(null);

// Modales
let importModal = null;
let editModal = null;

onMounted(async () => {
  // Inicializar modales
  importModal = new bootstrap.Modal(document.getElementById('importModal'));
  editModal = new bootstrap.Modal(document.getElementById('editModal'));
  
  // Verificar que el usuario sea SuperAdmin
  if (!authStore.isSuperAdmin) {
    console.error('Acceso denegado: Se requiere rol de SuperAdmin');
    return;
  }
  
  // Cargar datos
  await loadData();
});

// Cargar datos
async function loadData() {
  loading.value = true;
  
  try {
    // Cargar negocios
    const businessesSnapshot = await getDocs(collection(db, 'businesses'));
    businesses.value = businessesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Cargar clientes
    const clientsSnapshot = await getDocs(collection(db, 'customers'));
    clients.value = clientsSnapshot.docs.map(doc => ({
      phoneNumber: doc.id,
      ...doc.data()
    }));
    
    console.log('Clientes cargados:', clients.value.length);
  } catch (error) {
    console.error('Error al cargar datos:', error);
  } finally {
    loading.value = false;
  }
}

// Filtrar clientes
const filteredClients = computed(() => {
  let result = [...clients.value];
  
  // Filtrar por término de búsqueda
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    result = result.filter(client => 
      (client.profile?.name || '').toLowerCase().includes(term) || 
      client.phoneNumber.toLowerCase().includes(term) ||
      (client.profile?.email || '').toLowerCase().includes(term)
    );
  }
  
  // Filtrar por negocio
  if (businessFilter.value) {
    result = result.filter(client => 
      client.businesses && client.businesses[businessFilter.value]
    );
  }
  
  // Filtrar por actividad
  if (activityFilter.value !== 'all') {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    result = result.filter(client => {
      const lastActive = client.profile?.lastActive ? 
        (client.profile.lastActive instanceof Date ? client.profile.lastActive : 
         client.profile.lastActive instanceof Timestamp ? client.profile.lastActive.toDate() : 
         new Date(client.profile.lastActive)) : null;
      
      if (!lastActive) return activityFilter.value === 'inactive';
      
      return activityFilter.value === 'active' ? 
        lastActive > thirtyDaysAgo : 
        lastActive <= thirtyDaysAgo;
    });
  }
  
  return result;
});

// Paginación
const totalPages = computed(() => 
  Math.ceil(filteredClients.value.length / itemsPerPage.value)
);

const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredClients.value.slice(start, end);
});

// Resetear filtros
function resetFilters() {
  searchTerm.value = '';
  businessFilter.value = '';
  activityFilter.value = 'all';
  currentPage.value = 1;
}

// Obtener iniciales
function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

// Obtener nombre del negocio
function getBusinessName(businessId) {
  const business = businesses.value.find(b => b.id === businessId);
  return business ? business.name : businessId;
}

// Obtener inicial del negocio
function getBusinessInitial(businessId) {
  const business = businesses.value.find(b => b.id === businessId);
  return business ? business.name.charAt(0).toUpperCase() : '?';
}

// Formatear fecha
function formatDate(date, includeTime = true) {
  if (!date) return 'N/D';
  
  const d = date instanceof Date ? date : 
            date instanceof Timestamp ? date.toDate() : 
            new Date(date);
  
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return new Intl.DateTimeFormat('es-ES', options).format(d);
}

// Verificar si el cliente está activo (última actividad en los últimos 30 días)
function isClientActive(client) {
  if (!client.profile?.lastActive) return false;
  
  const lastActive = client.profile.lastActive instanceof Date ? client.profile.lastActive : 
                     client.profile.lastActive instanceof Timestamp ? client.profile.lastActive.toDate() : 
                     new Date(client.profile.lastActive);
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return lastActive > thirtyDaysAgo;
}

// Obtener total de compras
function getTotalPurchases(client) {
  if (!client.businesses) return 0;
  
  return Object.values(client.businesses)
    .reduce((total, business) => total + (business.purchaseCount || 0), 0);
}

// Obtener total gastado
function getTotalSpent(client) {
  if (!client.businesses) return 0;
  
  return Object.values(client.businesses)
    .reduce((total, business) => total + (business.totalSpent || 0), 0);
}

// Enviar WhatsApp
function sendWhatsApp(client) {
  const phone = client.phoneNumber;
  const message = encodeURIComponent('Hola, gracias por ser cliente de nuestra tienda.');
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
}

// Manejar carga de archivo CSV
function handleFileUpload(event) {
  csvFile.value = event.target.files[0];
}

// Importar clientes desde CSV
function importCSV() {
  if (!csvFile.value) return;
  
  Papa.parse(csvFile.value, {
    header: true,
    complete: async (results) => {
      try {
        const { data } = results;
        
        for (const row of data) {
          if (!row.phoneNumber) continue;
          
          // Formatear número de teléfono (asegurar que tenga el prefijo +)
          const phoneNumber = row.phoneNumber.startsWith('+') ? 
            row.phoneNumber : `+${row.phoneNumber}`;
          
          // Verificar si el cliente ya existe
          const existingClient = clients.value.find(c => c.phoneNumber === phoneNumber);
          
          if (existingClient) {
            // Actualizar cliente existente
            const clientRef = doc(db, 'customers', phoneNumber);
            await updateDoc(clientRef, {
              profile: {
                ...existingClient.profile,
                name: row.name || existingClient.profile?.name,
                email: row.email || existingClient.profile?.email,
                birthday: row.birthday || existingClient.profile?.birthday
              }
            });
          } else {
            // Crear nuevo cliente
            const clientRef = doc(db, 'customers', phoneNumber);
            await setDoc(clientRef, {
              profile: {
                phoneNumber,
                name: row.name || '',
                email: row.email || '',
                birthday: row.birthday || null,
                createdAt: Timestamp.now(),
                lastActive: Timestamp.now()
              },
              businesses: {}
            });
          }
        }
        
        // Recargar datos
        await loadData();
        
        // Cerrar modal
        importModal.hide();
        
        // Limpiar archivo
        csvFile.value = null;
        document.getElementById('csvFile').value = '';
        
        alert(`Importación completada. ${data.length} clientes procesados.`);
      } catch (error) {
        console.error('Error al importar clientes:', error);
        alert('Error al importar clientes. Consulta la consola para más detalles.');
      }
    },
    error: (error) => {
      console.error('Error al parsear CSV:', error);
      alert('Error al parsear el archivo CSV.');
    }
  });
}

// Exportar clientes a CSV
function exportToCSV() {
  // Preparar datos para exportación
  const data = filteredClients.value.map(client => ({
    phoneNumber: client.phoneNumber,
    name: client.profile?.name || '',
    email: client.profile?.email || '',
    birthday: client.profile?.birthday ? formatDate(client.profile.birthday, false) : '',
    lastActive: client.profile?.lastActive ? formatDate(client.profile.lastActive) : '',
    totalPurchases: getTotalPurchases(client),
    totalSpent: getTotalSpent(client).toFixed(2),
    businesses: Object.keys(client.businesses || {}).map(id => getBusinessName(id)).join(', ')
  }));
  
  // Convertir a CSV
  const csv = Papa.unparse(data);
  
  // Crear blob y descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `clientes_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
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

.activity-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.business-icons {
  display: flex;
  flex-wrap: wrap;
}

.business-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-right: 4px;
  margin-bottom: 4px;
}
</style>
