<!-- src/views/admin/ClientForm.vue -->
<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <p class="mt-2 text-muted">Cargando información del cliente...</p>
            </div>
            <div v-else-if="!clientData" class="text-center py-5">
              <AlertCircle size="48" class="text-danger mb-3" />
              <h5>Cliente no encontrado</h5>
              <p class="text-muted">No se encontró información para el cliente con número {{ phoneNumber }}</p>
              <router-link to="/admin/clients" class="btn btn-primary mt-2">
                <ArrowLeft size="18" class="me-1" /> Volver a la lista de clientes
              </router-link>
            </div>
            <div v-else>
              <h5 class="mb-4">Editar información del cliente</h5>
              
              <form @submit.prevent="saveClient">
                <div class="row g-3">
                  <!-- Información básica -->
                  <div class="col-md-6">
                    <div class="card h-100">
                      <div class="card-header bg-transparent py-3">
                        <h6 class="mb-0">Información básica</h6>
                      </div>
                      <div class="card-body">
                        <div class="mb-3">
                          <label for="phoneNumber" class="form-label">Número de teléfono</label>
                          <input 
                            type="text" 
                            class="form-control" 
                            id="phoneNumber" 
                            v-model="clientData.phoneNumber" 
                            disabled
                          >
                          <div class="form-text">El número de teléfono no se puede modificar</div>
                        </div>
                        
                        <div class="mb-3">
                          <label for="name" class="form-label">Nombre completo</label>
                          <input 
                            type="text" 
                            class="form-control" 
                            id="name" 
                            v-model="clientData.profile.name" 
                            placeholder="Nombre del cliente"
                            required
                          >
                        </div>
                        
                        <div class="mb-3">
                          <label for="email" class="form-label">Correo electrónico</label>
                          <input 
                            type="email" 
                            class="form-control" 
                            id="email" 
                            v-model="clientData.profile.email" 
                            placeholder="correo@ejemplo.com"
                          >
                        </div>
                        
                        <div class="mb-3">
                          <label for="birthday" class="form-label">Fecha de cumpleaños</label>
                          <input 
                            type="date" 
                            class="form-control" 
                            id="birthday" 
                            v-model="clientData.profile.birthday"
                          >
                        </div>
                        
                        <div class="mb-3">
                          <label for="notes" class="form-label">Notas</label>
                          <textarea 
                            class="form-control" 
                            id="notes" 
                            v-model="clientData.profile.notes" 
                            rows="3"
                            placeholder="Información adicional sobre el cliente"
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Información adicional -->
                  <div class="col-md-6">
                    <div class="card mb-4">
                      <div class="card-header bg-transparent py-3">
                        <h6 class="mb-0">Información de actividad</h6>
                      </div>
                      <div class="card-body">
                        <div class="mb-3">
                          <label class="form-label">Fecha de registro</label>
                          <p class="form-control-plaintext">{{ formatDate(clientData.profile.createdAt) }}</p>
                        </div>
                        
                        <div class="mb-3">
                          <label class="form-label">Última actividad</label>
                          <p class="form-control-plaintext">{{ formatDate(clientData.profile.lastActive) }}</p>
                        </div>
                        
                        <div class="mb-3">
                          <label class="form-label">Total de negocios</label>
                          <p class="form-control-plaintext">{{ Object.keys(clientData.businesses || {}).length }}</p>
                        </div>
                        
                        <div class="mb-3">
                          <label class="form-label">Total de compras</label>
                          <p class="form-control-plaintext">{{ getTotalPurchases() }}</p>
                        </div>
                        
                        <div class="mb-3">
                          <label class="form-label">Total gastado</label>
                          <p class="form-control-plaintext">S/ {{ getTotalSpent().toFixed(2) }}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div class="card">
                      <div class="card-header bg-transparent py-3">
                        <h6 class="mb-0">Preferencias de comunicación</h6>
                      </div>
                      <div class="card-body">
                        <div class="form-check form-switch mb-3">
                          <input 
                            class="form-check-input" 
                            type="checkbox" 
                            id="allowMarketing" 
                            v-model="clientData.profile.allowMarketing"
                          >
                          <label class="form-check-label" for="allowMarketing">
                            Permitir comunicaciones de marketing
                          </label>
                        </div>
                        
                        <div class="form-check form-switch mb-3">
                          <input 
                            class="form-check-input" 
                            type="checkbox" 
                            id="allowPromotions" 
                            v-model="clientData.profile.allowPromotions"
                          >
                          <label class="form-check-label" for="allowPromotions">
                            Recibir promociones y ofertas
                          </label>
                        </div>
                        
                        <div class="form-check form-switch mb-3">
                          <input 
                            class="form-check-input" 
                            type="checkbox" 
                            id="allowBirthdayMessage" 
                            v-model="clientData.profile.allowBirthdayMessage"
                          >
                          <label class="form-check-label" for="allowBirthdayMessage">
                            Recibir mensaje de cumpleaños
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Botones de acción -->
                  <div class="col-12 mt-4">
                    <div class="d-flex justify-content-between">
                      <router-link to="/admin/clients" class="btn btn-outline-secondary">
                        <ArrowLeft size="18" class="me-1" /> Cancelar
                      </router-link>
                      <div>
                        <button type="button" class="btn btn-outline-danger me-2" @click="confirmDelete">
                          <Trash size="18" class="me-1" /> Eliminar datos
                        </button>
                        <button type="submit" class="btn btn-primary">
                          <Save size="18" class="me-1" /> Guardar cambios
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal de confirmación de eliminación -->
    <div class="modal fade" id="deleteModal" tabindex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="deleteModalLabel">Confirmar eliminación</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-danger">
              <AlertTriangle size="18" class="me-2" />
              Esta acción eliminará todos los datos personales del cliente, pero mantendrá el historial de compras anónimo.
            </div>
            <p>
              ¿Estás seguro de que deseas eliminar los datos personales de 
              <strong>{{ clientData?.profile?.name || 'este cliente' }}</strong>?
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-danger" @click="deleteClientData">
              <Trash size="18" class="me-1" /> Eliminar datos
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuthStore } from '@/stores/auth';
import * as bootstrap from 'bootstrap';

// Importar componentes de Lucide
import { 
  AlertCircle, ArrowLeft, Save, Trash, AlertTriangle
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Datos del cliente
const phoneNumber = ref(route.params.phoneNumber);
const clientData = ref(null);
const loading = ref(true);
let deleteModal = null;

onMounted(async () => {
  // Inicializar modal
  deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
  
  // Cargar datos
  await loadData();
});

// Cargar datos del cliente
async function loadData() {
  loading.value = true;
  
  try {
    // Cargar datos del cliente
    const customerRef = doc(db, 'customers', phoneNumber.value);
    const customerSnapshot = await getDoc(customerRef);
    
    if (customerSnapshot.exists()) {
      const data = customerSnapshot.data();
      
      // Asegurarse de que existan todas las propiedades necesarias
      if (!data.profile) {
        data.profile = {};
      }
      
      // Asegurarse de que phoneNumber esté en profile
      data.profile.phoneNumber = phoneNumber.value;
      
      // Inicializar propiedades que podrían no existir
      data.profile.email = data.profile.email || '';
      data.profile.birthday = data.profile.birthday || '';
      data.profile.notes = data.profile.notes || '';
      data.profile.allowMarketing = data.profile.allowMarketing || false;
      data.profile.allowPromotions = data.profile.allowPromotions || false;
      data.profile.allowBirthdayMessage = data.profile.allowBirthdayMessage || false;
      
      clientData.value = data;
    } else {
      clientData.value = null;
    }
  } catch (error) {
    console.error('Error al cargar datos del cliente:', error);
  } finally {
    loading.value = false;
  }
}

// Guardar cambios del cliente
async function saveClient() {
  try {
    const customerRef = doc(db, 'customers', phoneNumber.value);
    
    // Actualizar solo el objeto profile
    await updateDoc(customerRef, {
      profile: clientData.value.profile
    });
    
    // Redirigir a la vista de detalle
    router.push(`/admin/clients/${phoneNumber.value}`);
  } catch (error) {
    console.error('Error al guardar datos del cliente:', error);
    alert('Error al guardar los cambios. Por favor, inténtalo de nuevo.');
  }
}

// Confirmar eliminación
function confirmDelete() {
  deleteModal.show();
}

// Eliminar datos personales del cliente
async function deleteClientData() {
  try {
    const customerRef = doc(db, 'customers', phoneNumber.value);
    
    // Mantener solo los datos de compras, eliminando la información personal
    await updateDoc(customerRef, {
      profile: {
        phoneNumber: phoneNumber.value,
        name: 'Cliente anónimo',
        email: '',
        birthday: '',
        notes: '',
        createdAt: clientData.value.profile.createdAt,
        lastActive: clientData.value.profile.lastActive,
        dataDeleted: true,
        deletedAt: Timestamp.now()
      }
    });
    
    // Cerrar modal
    deleteModal.hide();
    
    // Redirigir a la lista de clientes
    router.push('/admin/clients');
  } catch (error) {
    console.error('Error al eliminar datos del cliente:', error);
    alert('Error al eliminar los datos. Por favor, inténtalo de nuevo.');
  }
}

// Formatear fecha
function formatDate(date) {
  if (!date) return 'No disponible';
  
  const d = date instanceof Date ? date : 
            date instanceof Timestamp ? date.toDate() : 
            new Date(date);
  
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

// Obtener total de compras
function getTotalPurchases() {
  if (!clientData.value || !clientData.value.businesses) return 0;
  
  return Object.values(clientData.value.businesses)
    .reduce((total, business) => total + (business.purchaseCount || 0), 0);
}

// Obtener total gastado
function getTotalSpent() {
  if (!clientData.value || !clientData.value.businesses) return 0;
  
  return Object.values(clientData.value.businesses)
    .reduce((total, business) => total + (business.totalSpent || 0), 0);
}
</script>
