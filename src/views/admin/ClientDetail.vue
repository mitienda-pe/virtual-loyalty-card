<!-- src/views/admin/ClientDetail.vue -->
<template>
  <div class="container-fluid">
    <!-- Información del cliente -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <p class="mt-2 text-muted">Cargando información del cliente...</p>
            </div>
            <div v-else-if="!customerData" class="text-center py-5">
              <AlertCircle size="48" class="text-danger mb-3" />
              <h5>Cliente no encontrado</h5>
              <p class="text-muted">No se encontró información para el cliente con número {{ phoneNumber }}</p>
              <router-link to="/admin/users" class="btn btn-primary mt-2">
                <ArrowLeft size="18" class="me-1" /> Volver a la lista de usuarios
              </router-link>
            </div>
            <div v-else class="row">
              <div class="col-md-6">
                <div class="d-flex align-items-center mb-3">
                  <div class="avatar-circle bg-primary bg-opacity-10 text-primary me-3" style="width: 60px; height: 60px; font-size: 1.5rem;">
                    {{ getInitials(customerData.profile?.name || 'Cliente') }}
                  </div>
                  <div>
                    <h4 class="mb-0">{{ customerData.profile?.name || 'Cliente sin nombre' }}</h4>
                    <p class="text-muted mb-0">{{ phoneNumber }}</p>
                  </div>
                </div>
                <div class="mt-4">
                  <h6 class="text-uppercase text-muted small fw-bold mb-3">Información general</h6>
                  <div class="mb-2 d-flex">
                    <Calendar class="text-muted me-2" size="18" />
                    <div>
                      <span class="text-muted">Registrado:</span>
                      <span class="ms-2">{{ formatDate(customerData.profile?.createdAt) }}</span>
                    </div>
                  </div>
                  <div class="mb-2 d-flex">
                    <Clock class="text-muted me-2" size="18" />
                    <div>
                      <span class="text-muted">Última actividad:</span>
                      <span class="ms-2">{{ formatDate(customerData.profile?.lastActive) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="card bg-light border-0 h-100">
                  <div class="card-body">
                    <h6 class="text-uppercase text-muted small fw-bold mb-3">Estadísticas de consumo</h6>
                    <div class="row g-3">
                      <div class="col-6">
                        <div class="p-3 bg-white rounded shadow-sm">
                          <div class="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 class="text-muted small mb-1">Total negocios</h6>
                              <h4 class="mb-0">{{ Object.keys(customerData.businesses || {}).length }}</h4>
                            </div>
                            <Store class="text-primary" size="24" />
                          </div>
                        </div>
                      </div>
                      <div class="col-6">
                        <div class="p-3 bg-white rounded shadow-sm">
                          <div class="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 class="text-muted small mb-1">Total compras</h6>
                              <h4 class="mb-0">{{ getTotalPurchases() }}</h4>
                            </div>
                            <ShoppingBag class="text-success" size="24" />
                          </div>
                        </div>
                      </div>
                      <div class="col-6">
                        <div class="p-3 bg-white rounded shadow-sm">
                          <div class="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 class="text-muted small mb-1">Monto total</h6>
                              <h4 class="mb-0">S/ {{ getTotalSpent().toFixed(2) }}</h4>
                            </div>
                            <CreditCard class="text-warning" size="24" />
                          </div>
                        </div>
                      </div>
                      <div class="col-6">
                        <div class="p-3 bg-white rounded shadow-sm">
                          <div class="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 class="text-muted small mb-1">Última compra</h6>
                              <h4 class="mb-0">{{ getLastPurchaseDate() }}</h4>
                            </div>
                            <Calendar class="text-info" size="24" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Negocios donde ha comprado -->
    <div class="row mb-4" v-if="customerData">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent border-0 py-3">
            <h5 class="mb-0">Negocios frecuentados</h5>
          </div>
          <div class="card-body p-0">
            <div v-if="Object.keys(customerData.businesses || {}).length === 0" class="text-center py-5">
              <Store class="text-muted" size="48" />
              <p class="mt-3 text-muted">Este cliente no ha realizado compras en ningún negocio</p>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col" class="border-0">Negocio</th>
                    <th scope="col" class="border-0">Primera visita</th>
                    <th scope="col" class="border-0">Última visita</th>
                    <th scope="col" class="border-0">Compras</th>
                    <th scope="col" class="border-0">Total gastado</th>
                    <th scope="col" class="border-0 text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(businessData, businessId) in customerData.businesses" :key="businessId">
                    <td>
                      <div class="d-flex align-items-center">
                        <div class="avatar-circle bg-primary bg-opacity-10 text-primary me-3">
                          {{ getInitials(getBusinessName(businessId)) }}
                        </div>
                        <div>
                          <h6 class="mb-0">{{ getBusinessName(businessId) }}</h6>
                          <small class="text-muted">{{ businessId }}</small>
                        </div>
                      </div>
                    </td>
                    <td>{{ formatDate(businessData.firstVisit) }}</td>
                    <td>{{ formatDate(businessData.lastVisit) }}</td>
                    <td>
                      <span class="badge bg-primary">{{ businessData.purchaseCount || 0 }}</span>
                    </td>
                    <td>
                      <span class="fw-bold">S/ {{ (businessData.totalSpent || 0).toFixed(2) }}</span>
                    </td>
                    <td class="text-end">
                      <button class="btn btn-sm btn-outline-primary" @click="viewBusinessPurchases(businessId)">
                        <Eye size="16" /> Ver compras
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Historial de compras -->
    <div class="row" v-if="customerData && selectedBusinessId">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent border-0 py-3 d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Compras en {{ getBusinessName(selectedBusinessId) }}</h5>
            <button class="btn btn-sm btn-outline-secondary" @click="selectedBusinessId = null">
              <X size="16" /> Cerrar
            </button>
          </div>
          <div class="card-body p-0">
            <div v-if="!businessPurchases.length" class="text-center py-5">
              <Receipt class="text-muted" size="48" />
              <p class="mt-3 text-muted">No hay compras registradas para este negocio</p>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col" class="border-0">N° Factura</th>
                    <th scope="col" class="border-0">Fecha</th>
                    <th scope="col" class="border-0">Monto</th>
                    <th scope="col" class="border-0">Estado</th>
                    <th scope="col" class="border-0 text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="purchase in businessPurchases" :key="purchase.id">
                    <td>
                      <span class="badge bg-light text-dark">
                        <FileText class="me-1" size="14" /> {{ purchase.invoiceNumber || 'N/D' }}
                      </span>
                    </td>
                    <td>{{ formatDate(purchase.date) }}</td>
                    <td>
                      <span class="fw-bold">S/ {{ purchase.amount.toFixed(2) }}</span>
                    </td>
                    <td>
                      <span class="badge" :class="purchase.verified ? 'bg-success' : 'bg-warning'">
                        {{ purchase.verified ? 'Verificado' : 'Pendiente' }}
                      </span>
                    </td>
                    <td class="text-end">
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-info" @click="viewReceiptDetails(purchase)">
                          <Receipt size="16" />
                        </button>
                        <button v-if="!purchase.verified" class="btn btn-outline-success" @click="verifyReceipt(purchase)">
                          <CheckCircle size="16" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para ver recibo -->
    <div class="modal fade" id="receiptModal" tabindex="-1" aria-labelledby="receiptModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="receiptModalLabel">Detalles del Recibo</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-if="selectedReceipt">
              <div class="row mb-4">
                <div class="col-md-6">
                  <h6 class="text-muted mb-2">Información del Cliente</h6>
                  <p class="mb-1"><strong>Nombre:</strong> {{ selectedReceipt.customerName }}</p>
                  <p class="mb-1"><strong>Teléfono:</strong> {{ selectedReceipt.phoneNumber }}</p>
                  <p class="mb-0"><strong>Fecha:</strong> {{ formatDate(selectedReceipt.date) }}</p>
                </div>
                <div class="col-md-6">
                  <h6 class="text-muted mb-2">Información de la Compra</h6>
                  <p class="mb-1"><strong>Monto:</strong> S/ {{ selectedReceipt.amount.toFixed(2) }}</p>
                  <p class="mb-1"><strong>Estado:</strong> 
                    <span class="badge" :class="selectedReceipt.verified ? 'bg-success' : 'bg-warning'">
                      {{ selectedReceipt.verified ? 'Verificado' : 'Pendiente' }}
                    </span>
                  </p>
                  <p class="mb-0"><strong>N° Factura:</strong> {{ selectedReceipt.invoiceNumber || 'No disponible' }}</p>
                </div>
              </div>
              <div class="mb-3">
                <h6 class="text-muted mb-2">Imagen del Recibo</h6>
                <div v-if="selectedReceipt.receiptUrl" class="text-center border p-2">
                  <img :src="selectedReceipt.receiptUrl" alt="Recibo" class="img-fluid" style="max-height: 400px;">
                </div>
                <div v-else class="text-center border p-5">
                  <Image class="text-muted mb-2" size="48" />
                  <p class="text-muted">No hay imagen disponible para este recibo</p>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            <button 
              v-if="selectedReceipt && !selectedReceipt.verified" 
              type="button" 
              class="btn btn-success"
              @click="verifyReceipt(selectedReceipt)"
            >
              <CheckCircle size="18" class="me-1" /> Verificar Recibo
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
import { doc, getDoc, collection, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuthStore } from '@/stores/auth';
import * as bootstrap from 'bootstrap';

// Importar componentes de Lucide
import { 
  AlertCircle, ArrowLeft, Calendar, Clock, Store, ShoppingBag, 
  CreditCard, Eye, X, Receipt, CheckCircle, FileText, Image 
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Datos del cliente
const phoneNumber = ref(route.params.phoneNumber);
const customerData = ref(null);
const loading = ref(true);
const businesses = ref([]);

// Datos de compras
const selectedBusinessId = ref(null);
const businessPurchases = ref([]);
const selectedReceipt = ref(null);
let receiptModal = null;

onMounted(async () => {
  // Inicializar modal
  receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
  
  // Cargar datos
  await loadData();
});

// Cargar datos del cliente
async function loadData() {
  loading.value = true;
  
  try {
    // Cargar negocios
    const businessesSnapshot = await getDocs(collection(db, 'businesses'));
    businesses.value = businessesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Cargar datos del cliente
    const customerRef = doc(db, 'customers', phoneNumber.value);
    const customerSnapshot = await getDoc(customerRef);
    
    if (customerSnapshot.exists()) {
      customerData.value = customerSnapshot.data();
    } else {
      customerData.value = null;
    }
  } catch (error) {
    console.error('Error al cargar datos del cliente:', error);
  } finally {
    loading.value = false;
  }
}

// Ver compras de un negocio específico
async function viewBusinessPurchases(businessId) {
  selectedBusinessId.value = businessId;
  businessPurchases.value = [];
  
  try {
    const purchasesRef = collection(db, 'business_purchases', businessId, 'purchases');
    const purchasesSnapshot = await getDocs(purchasesRef);
    
    // Filtrar solo las compras del cliente actual
    businessPurchases.value = purchasesSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date instanceof Timestamp ? doc.data().date.toDate() : new Date(doc.data().date)
      }))
      .filter(purchase => purchase.phoneNumber === phoneNumber.value);
  } catch (error) {
    console.error('Error al cargar compras:', error);
  }
}

// Ver detalles del recibo
function viewReceiptDetails(receipt) {
  selectedReceipt.value = receipt;
  receiptModal.show();
}

// Verificar recibo
async function verifyReceipt(receipt) {
  try {
    const receiptRef = doc(db, 'business_purchases', receipt.businessId, 'purchases', receipt.id);
    await updateDoc(receiptRef, {
      verified: true
    });
    
    // Actualizar en la lista local
    if (receipt === selectedReceipt.value) {
      selectedReceipt.value.verified = true;
    }
    
    const index = businessPurchases.value.findIndex(p => p.id === receipt.id);
    if (index !== -1) {
      businessPurchases.value[index].verified = true;
    }
    
    // Cerrar modal si está abierto
    if (receipt === selectedReceipt.value) {
      receiptModal.hide();
    }
    
    // Recargar datos del cliente para actualizar estadísticas
    await loadData();
  } catch (error) {
    console.error('Error al verificar recibo:', error);
  }
}

// Obtener nombre del negocio
function getBusinessName(businessId) {
  const business = businesses.value.find(b => b.id === businessId);
  return business ? business.name : businessId;
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

// Formatear fecha
function formatDate(date) {
  if (!date) return 'N/D';
  
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
  if (!customerData.value || !customerData.value.businesses) return 0;
  
  return Object.values(customerData.value.businesses)
    .reduce((total, business) => total + (business.purchaseCount || 0), 0);
}

// Obtener total gastado
function getTotalSpent() {
  if (!customerData.value || !customerData.value.businesses) return 0;
  
  return Object.values(customerData.value.businesses)
    .reduce((total, business) => total + (business.totalSpent || 0), 0);
}

// Obtener fecha de última compra
function getLastPurchaseDate() {
  if (!customerData.value || !customerData.value.businesses) return 'N/D';
  
  const lastDates = Object.values(customerData.value.businesses)
    .map(business => business.lastVisit)
    .filter(date => date);
  
  if (lastDates.length === 0) return 'N/D';
  
  const latestDate = new Date(Math.max(...lastDates.map(date => 
    date instanceof Date ? date.getTime() : 
    date instanceof Timestamp ? date.toDate().getTime() : 
    new Date(date).getTime()
  )));
  
  return formatDate(latestDate);
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
</style>
