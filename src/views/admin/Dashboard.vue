<!-- src/views/admin/Dashboard.vue -->
<template>
  <div class="dashboard">
    <!-- Dashboard de SuperAdmin -->
    <div v-if="authStore.isSuperAdmin">
      <div class="row">
        <div class="col-md-4 mb-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-muted mb-1">Total de Negocios</h6>
                  <h2 class="display-6 mb-0">{{ stats.totalBusinesses }}</h2>
                </div>
                <div class="rounded-circle bg-primary bg-opacity-10 p-3">
                  <Building class="text-primary" size="24" />
                </div>
              </div>
              <div class="mt-3">
                <router-link to="/admin/businesses" class="btn btn-sm btn-primary">
                  Ver negocios
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4 mb-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-muted mb-1">Total de Clientes</h6>
                  <h2 class="display-6 mb-0">{{ stats.totalClients }}</h2>
                </div>
                <div class="rounded-circle bg-success bg-opacity-10 p-3">
                  <Users class="text-success" size="24" />
                </div>
              </div>
              <div class="mt-3">
                <router-link to="/admin/users" class="btn btn-sm btn-success">
                  Ver usuarios
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4 mb-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-muted mb-1">Total de Transacciones</h6>
                  <h2 class="display-6 mb-0">{{ stats.totalTransactions }}</h2>
                </div>
                <div class="rounded-circle bg-info bg-opacity-10 p-3">
                  <Receipt class="text-info" size="24" />
                </div>
              </div>
              <div class="mt-3">
                <router-link to="/admin/statistics" class="btn btn-sm btn-info">
                  Ver estadísticas
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-md-8 mb-4">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white">
              <h5 class="mb-0">Negocios Recientes</h5>
            </div>
            <div class="card-body p-0">
              <div v-if="loading" class="p-4 text-center">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Cargando...</span>
                </div>
              </div>
              <div v-else-if="recentBusinesses.length === 0" class="p-4 text-center">
                <p class="text-muted mb-0">No hay negocios registrados</p>
              </div>
              <div v-else class="table-responsive">
                <table class="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Ciudad</th>
                      <th>Administrador</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="business in recentBusinesses" :key="business.id">
                      <td>{{ business.name }}</td>
                      <td>{{ business.city || '-' }}</td>
                      <td>{{ business.adminEmail || '-' }}</td>
                      <td>{{ formatDate(business.createdAt) }}</td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <router-link :to="`/admin/businesses/${business.id}/edit`" class="btn btn-outline-primary">
                            <i class="bi bi-pencil"></i>
                          </router-link>
                          <button @click="viewBusinessDetails(business)" class="btn btn-outline-info">
                            <i class="bi bi-eye"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="card-footer bg-white">
              <router-link to="/admin/businesses" class="btn btn-sm btn-primary">
                Ver todos los negocios
              </router-link>
            </div>
          </div>
        </div>

        <div class="col-md-4 mb-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white">
              <h5 class="mb-0">Configuración de WhatsApp</h5>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="fw-bold">Estado de la API:</span>
                  <span class="badge"
                    :class="whatsappConfig.apiToken && whatsappConfig.appSecret ? 'bg-success' : 'bg-warning'">
                    {{ whatsappConfig.apiToken && whatsappConfig.appSecret ? 'Configurado' : 'Configuración incompleta' }}
                  </span>
                </div>
                <div class="alert"
                  :class="whatsappConfig.apiToken && whatsappConfig.appSecret ? 'alert-info' : 'alert-warning'" mb-3>
                  <small>
                    <component 
                      :is="whatsappConfig.apiToken && whatsappConfig.appSecret ? Info : AlertTriangle"
                      size="14" class="me-1" />
                    {{ whatsappConfig.apiToken && whatsappConfig.appSecret ?
                      'La API de WhatsApp está configurada correctamente.' :
                      'Se requiere configurar el Token de API y el Secreto de la aplicación.' }}
                  </small>
                </div>
              </div>

              <div class="mb-3">
                <h6>Webhook URL</h6>
                <div class="input-group mb-2">
                  <input type="text" class="form-control form-control-sm"
                    value="https://us-central1-virtual-loyalty-card-e37c9.cloudfunctions.net/processWhatsAppAPI"
                    readonly>
                  <button class="btn btn-outline-secondary btn-sm" type="button"
                    @click="copyToClipboard('https://us-central1-virtual-loyalty-card-e37c9.cloudfunctions.net/processWhatsAppAPI')">
                    <Clipboard size="14" />
                  </button>
                </div>
              </div>

              <div class="mb-3">
                <h6>Token de Verificación</h6>
                <div class="input-group mb-2">
                  <input type="text" class="form-control form-control-sm" value="38f7d5a1-b65c-4e9d-9f2d-ea9c21b7ca56"
                    readonly>
                  <button class="btn btn-outline-secondary btn-sm" type="button"
                    @click="copyToClipboard('38f7d5a1-b65c-4e9d-9f2d-ea9c21b7ca56')">
                    <Clipboard size="14" />
                  </button>
                </div>
              </div>

              <div class="mb-3">
                <h6>ID del Teléfono</h6>
                <div class="input-group mb-2">
                  <input type="text" class="form-control form-control-sm" value="108512615643697" readonly>
                  <button class="btn btn-outline-secondary btn-sm" type="button"
                    @click="copyToClipboard('108512615643697')">
                    <Clipboard size="14" />
                  </button>
                </div>
              </div>

              <div class="mb-3">
                <h6>Token de API</h6>
                <div class="input-group mb-2">
                  <input type="password" class="form-control form-control-sm" v-model="whatsappConfig.apiToken"
                    placeholder="Ingresa el token de API de WhatsApp">
                  <button class="btn btn-outline-secondary btn-sm" type="button" @click="toggleTokenVisibility">
                    <component :is="showToken ? EyeOff : Eye" size="14" />
                  </button>
                </div>
                <small class="text-muted">Token de acceso permanente para la API de WhatsApp</small>
              </div>

              <div class="mb-3">
                <h6>Secreto de la Aplicación</h6>
                <div class="input-group mb-2">
                  <input type="password" class="form-control form-control-sm" v-model="whatsappConfig.appSecret"
                    placeholder="Ingresa el secreto de la aplicación">
                  <button class="btn btn-outline-secondary btn-sm" type="button" @click="toggleSecretVisibility">
                    <component :is="showSecret ? EyeOff : Eye" size="14" />
                  </button>
                </div>
                <small class="text-muted">Secreto de la aplicación de WhatsApp</small>
              </div>

              <div class="mt-3">
                <button class="btn btn-primary w-100" @click="saveWhatsAppConfig">
                  <Save class="me-1" size="14" /> Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-md-6 mb-4">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white">
              <h5 class="mb-0">Actividad Reciente</h5>
            </div>
            <div class="card-body p-0">
              <div v-if="loading" class="p-4 text-center">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Cargando...</span>
                </div>
              </div>
              <div v-else class="list-group list-group-flush">
                <div v-for="(activity, index) in recentActivities" :key="index" class="list-group-item">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">{{ activity.title }}</h6>
                    <small class="text-muted">{{ formatDate(activity.timestamp) }}</small>
                  </div>
                  <p class="mb-1">{{ activity.description }}</p>
                  <small class="text-muted">{{ activity.user }}</small>
                </div>
                <div v-if="recentActivities.length === 0" class="list-group-item text-center py-4">
                  <p class="text-muted mb-0">No hay actividades recientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6 mb-4">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white">
              <h5 class="mb-0">Acciones Rápidas</h5>
            </div>
            <div class="card-body">
              <div class="d-grid gap-3">
                <router-link to="/admin/businesses/new" class="btn btn-outline-primary">
                  <i class="bi bi-building-add me-2"></i> Crear Nuevo Negocio
                </router-link>
                <router-link to="/admin/users/new" class="btn btn-outline-success">
                  <i class="bi bi-person-plus me-2"></i> Crear Nuevo Usuario
                </router-link>
                <button class="btn btn-outline-info" @click="showSendNotificationModal">
                  <i class="bi bi-bell me-2"></i> Enviar Notificación
                </button>
                <button class="btn btn-outline-secondary" @click="showSystemSettingsModal">
                  <i class="bi bi-gear me-2"></i> Configuración del Sistema
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    

    <!-- Modal para configuración de WhatsApp -->
    <div class="modal fade" id="whatsappConfigModal" tabindex="-1" aria-labelledby="whatsappConfigModalLabel"
      aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="whatsappConfigModalLabel">Configuración Avanzada de WhatsApp</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info mb-3">
              <Info class="me-2" />
              <strong>Registro automático de clientes:</strong> Los clientes se registran automáticamente al enviar
              fotos de sus comprobantes de pago a nuestro número de WhatsApp.
            </div>

            <form @submit.prevent="saveWhatsAppConfig">
              <div class="mb-3">
                <label for="whatsappApiToken" class="form-label">Token de API de WhatsApp</label>
                <input type="text" class="form-control" id="whatsappApiToken" v-model="whatsappConfig.apiToken"
                  required>
                <div class="form-text">Token de acceso permanente para la API de WhatsApp</div>
              </div>
              <div class="mb-3">
                <label for="whatsappAppSecret" class="form-label">Secreto de la Aplicación</label>
                <input type="text" class="form-control" id="whatsappAppSecret" v-model="whatsappConfig.appSecret"
                  required>
                <div class="form-text">Secreto de la aplicación de WhatsApp</div>
              </div>

              <div class="mb-3">
                <label for="messageTemplates" class="form-label">Plantillas de mensajes</label>
                <div class="card">
                  <div class="card-body p-3">
                    <div v-for="(template, index) in whatsappConfig.templates" :key="index" class="mb-3">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">{{ template.name }}</h6>
                        <button type="button" class="btn btn-sm btn-outline-danger" @click="removeTemplate(index)">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                      <textarea class="form-control form-control-sm" v-model="template.content" rows="2"></textarea>
                    </div>

                    <button type="button" class="btn btn-sm btn-outline-primary w-100" @click="addTemplate">
                      <i class="bi bi-plus-circle me-1"></i> Agregar plantilla
                    </button>
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Configuración de respuestas automáticas</label>
                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" id="autoReplyEnabled"
                    v-model="whatsappConfig.autoReplyEnabled">
                  <label class="form-check-label" for="autoReplyEnabled">Habilitar respuestas automáticas</label>
                </div>
                <div v-if="whatsappConfig.autoReplyEnabled">
                  <textarea class="form-control" v-model="whatsappConfig.autoReplyMessage" rows="3"
                    placeholder="Mensaje de respuesta automática"></textarea>
                  <div class="form-text">Este mensaje se enviará automáticamente cuando un cliente envíe un comprobante
                    de pago.</div>
                </div>
              </div>

              <div class="d-grid">
                <button type="submit" class="btn btn-primary" :disabled="savingConfig">
                  <span v-if="savingConfig" class="spinner-border spinner-border-sm me-2" role="status"
                    aria-hidden="true"></span>
                  Guardar Configuración
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para enviar notificación -->
    <div class="modal fade" id="sendNotificationModal" tabindex="-1" aria-labelledby="sendNotificationModalLabel"
      aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="sendNotificationModalLabel">Enviar Notificación</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="sendNotification">
              <div class="mb-3">
                <label for="notificationType" class="form-label">Tipo de Notificación</label>
                <select class="form-select" id="notificationType" v-model="notification.type" required>
                  <option value="all">Todos los usuarios</option>
                  <option value="business_admins">Administradores de Negocios</option>
                  <option value="clients">Clientes</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="notificationTitle" class="form-label">Título</label>
                <input type="text" class="form-control" id="notificationTitle" v-model="notification.title" required>
              </div>
              <div class="mb-3">
                <label for="notificationMessage" class="form-label">Mensaje</label>
                <textarea class="form-control" id="notificationMessage" v-model="notification.message" rows="3"
                  required></textarea>
              </div>
              <div class="d-grid">
                <button type="submit" class="btn btn-primary" :disabled="sendingNotification">
                  <span v-if="sendingNotification" class="spinner-border spinner-border-sm me-2" role="status"
                    aria-hidden="true"></span>
                  Enviar Notificación
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para configuración del sistema -->
    <div class="modal fade" id="systemSettingsModal" tabindex="-1" aria-labelledby="systemSettingsModalLabel"
      aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="systemSettingsModalLabel">Configuración del Sistema</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveSystemSettings">
              <div class="mb-3">
                <label for="systemName" class="form-label">Nombre del Sistema</label>
                <input type="text" class="form-control" id="systemName" v-model="systemSettings.name" required>
              </div>
              <div class="mb-3">
                <label for="systemLogo" class="form-label">Logo del Sistema</label>
                <input type="file" class="form-control" id="systemLogo" @change="handleLogoChange" accept="image/*">
              </div>
              <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" id="enableRegistration"
                  v-model="systemSettings.enableRegistration">
                <label class="form-check-label" for="enableRegistration">Permitir registro de usuarios</label>
              </div>
              <div class="d-grid">
                <button type="submit" class="btn btn-primary" :disabled="savingSettings">
                  <span v-if="savingSettings" class="spinner-border spinner-border-sm me-2" role="status"
                    aria-hidden="true"></span>
                  Guardar Configuración
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

onMounted(() => {
  if (authStore.isBusinessAdmin) {
    router.replace('/admin/business/dashboard');
  }
});
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '@/stores/auth';
import { db } from '@/firebase';

// Importar componentes de Lucide
import { Building, Users, Receipt, Info, AlertTriangle, Clipboard, EyeOff, Eye, Save, MessageCircle } from 'lucide-vue-next';

const authStore = useAuthStore();
const loading = ref(true);
const stats = ref({
  totalBusinesses: 0,
  totalClients: 0,
  totalTransactions: 0,
  activeClients: 0,
  monthlyTransactions: 0,
  totalRewards: 0
});
const recentBusinesses = ref([]);
const recentActivities = ref([]);

// Para modales
const whatsappConfig = ref({
  apiToken: '',
  appSecret: '',
  autoReplyEnabled: true,
  autoReplyMessage: '¡Gracias por enviar tu comprobante! Tu consumo ha sido registrado correctamente. Puedes consultar tus puntos enviando la palabra "puntos".',
  templates: [
    { name: 'Bienvenida', content: '¡Hola! Bienvenido a nuestro programa de fidelidad. Puedes consultar tus puntos enviando la palabra "puntos".' },
    { name: 'Consulta de puntos', content: 'Tienes {{points}} puntos acumulados en {{business}}. ¡Sigue acumulando para obtener grandes premios!' },
    { name: 'Premio disponible', content: '¡Felicidades! Has acumulado suficientes puntos para canjear un premio en {{business}}. Visítanos pronto.' }
  ]
});
const savingConfig = ref(false);
let whatsappConfigModal = null;

// Visibilidad de credenciales
const showToken = ref(false);
const showSecret = ref(false);

const notification = ref({
  type: 'all',
  title: '',
  message: ''
});
const sendingNotification = ref(false);
let sendNotificationModal = null;

const systemSettings = ref({
  name: 'Tarjeta de Fidelidad Virtual',
  logo: null,
  enableRegistration: true
});
const savingSettings = ref(false);
let systemSettingsModal = null;

onMounted(async () => {
  // Inicializar modales de Bootstrap
  whatsappConfigModal = new bootstrap.Modal(document.getElementById('whatsappConfigModal'));
  sendNotificationModal = new bootstrap.Modal(document.getElementById('sendNotificationModal'));
  systemSettingsModal = new bootstrap.Modal(document.getElementById('systemSettingsModal'));

  if (authStore.isSuperAdmin) {
    await loadSuperAdminData();
  }

  loading.value = false;
});

async function loadSuperAdminData() {
  try {
    // Cargar estadísticas
    await loadStats();

    // Cargar negocios recientes
    await loadRecentBusinesses();

    // Cargar actividades recientes
    await loadRecentActivities();

    // Cargar configuración de WhatsApp
    await loadWhatsAppConfig();

    // Cargar configuración del sistema
    await loadSystemSettings();
  } catch (error) {
    console.error("Error al cargar datos del SuperAdmin:", error);
  }
}

async function loadStats() {
  try {
    // Contar negocios
    const businessesSnapshot = await getDocs(collection(db, "businesses"));
    stats.value.totalBusinesses = businessesSnapshot.size;

    // Contar clientes (usuarios con rol business-client)
    const clientsQuery = query(
      collection(db, "users"),
      where("role", "==", "business-client")
    );
    const clientsSnapshot = await getDocs(clientsQuery);
    stats.value.totalClients = clientsSnapshot.size;

    // Contar transacciones
    const transactionsSnapshot = await getDocs(collection(db, "transactions"));
    stats.value.totalTransactions = transactionsSnapshot.size;

    // Contar premios
    const rewardsSnapshot = await getDocs(collection(db, "rewards"));
    stats.value.totalRewards = rewardsSnapshot.size;
  } catch (error) {
    console.error("Error al cargar estadísticas:", error);
  }
}

async function loadRecentBusinesses() {
  try {
    const businessesQuery = query(
      collection(db, "businesses"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const snapshot = await getDocs(businessesQuery);

    // Obtener información adicional de cada negocio
    const businessesWithAdminInfo = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const business = {
        id: docSnap.id,
        ...docSnap.data()
      };

      // Si el negocio tiene un adminId, obtener su email
      if (business.adminId) {
        try {
          const adminDoc = await getDoc(doc(db, "users", business.adminId));
          if (adminDoc.exists()) {
            business.adminEmail = adminDoc.data().email;
          }
        } catch (error) {
          console.error("Error al obtener datos del administrador:", error);
        }
      }

      return business;
    }));

    recentBusinesses.value = businessesWithAdminInfo;
  } catch (error) {
    console.error("Error al cargar negocios recientes:", error);
  }
}

async function loadRecentActivities() {
  try {
    // Aquí cargaríamos actividades recientes desde la base de datos
    // Por ahora, usaremos datos de ejemplo
    recentActivities.value = [
      {
        title: "Nuevo negocio registrado",
        description: "Se ha registrado un nuevo negocio: Café Delicioso",
        user: "admin@example.com",
        timestamp: new Date(Date.now() - 3600000) // 1 hora atrás
      },
      {
        title: "Actualización de configuración",
        description: "Se ha actualizado la configuración de WhatsApp",
        user: "admin@example.com",
        timestamp: new Date(Date.now() - 86400000) // 1 día atrás
      }
    ];
  } catch (error) {
    console.error("Error al cargar actividades recientes:", error);
  }
}

async function loadWhatsAppConfig() {
  try {
    const configDoc = await getDoc(doc(db, "system", "whatsapp_config"));
    if (configDoc.exists()) {
      const data = configDoc.data();
      whatsappConfig.value = {
        apiToken: data.apiToken || '',
        appSecret: data.appSecret || '',
        autoReplyEnabled: data.autoReplyEnabled !== false,
        autoReplyMessage: data.autoReplyMessage || '¡Gracias por enviar tu comprobante! Tu consumo ha sido registrado correctamente. Puedes consultar tus puntos enviando la palabra "puntos".',
        templates: data.templates || [
          { name: 'Bienvenida', content: '¡Hola! Bienvenido a nuestro programa de fidelidad. Puedes consultar tus puntos enviando la palabra "puntos".' },
          { name: 'Consulta de puntos', content: 'Tienes {{points}} puntos acumulados en {{business}}. ¡Sigue acumulando para obtener grandes premios!' },
          { name: 'Premio disponible', content: '¡Felicidades! Has acumulado suficientes puntos para canjear un premio en {{business}}. Visítanos pronto.' }
        ]
      };
    }
  } catch (error) {
    console.error("Error al cargar configuración de WhatsApp:", error);
  }
}

async function loadSystemSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, "system", "settings"));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      systemSettings.value = {
        name: data.name || 'Tarjeta de Fidelidad Virtual',
        logo: data.logo || null,
        enableRegistration: data.enableRegistration !== false
      };
    }
  } catch (error) {
    console.error("Error al cargar configuración del sistema:", error);
  }
}

function showWhatsAppConfigModal() {
  whatsappConfigModal.show();
}

function showSendNotificationModal() {
  notification.value = {
    type: 'all',
    title: '',
    message: ''
  };
  sendNotificationModal.show();
}

function showSystemSettingsModal() {
  systemSettingsModal.show();
}

async function saveWhatsAppConfig() {
  savingConfig.value = true;

  try {
    await setDoc(doc(db, "system", "whatsapp_config"), {
      apiToken: whatsappConfig.value.apiToken,
      appSecret: whatsappConfig.value.appSecret,
      autoReplyEnabled: whatsappConfig.value.autoReplyEnabled,
      autoReplyMessage: whatsappConfig.value.autoReplyMessage,
      templates: whatsappConfig.value.templates,
      updatedAt: serverTimestamp()
    });

    alert("Configuración de WhatsApp guardada exitosamente.");
    if (whatsappConfigModal) {
      whatsappConfigModal.hide();
    }
  } catch (error) {
    console.error("Error al guardar configuración de WhatsApp:", error);
    alert("Error al guardar configuración: " + error.message);
  } finally {
    savingConfig.value = false;
  }
}

async function sendNotification() {
  sendingNotification.value = true;

  try {
    // Aquí iría la lógica para enviar notificaciones
    // Por ahora, solo simularemos el proceso

    await new Promise(resolve => setTimeout(resolve, 1000));

    alert("Notificación enviada exitosamente.");
    sendNotificationModal.hide();
  } catch (error) {
    console.error("Error al enviar notificación:", error);
    alert("Error al enviar notificación: " + error.message);
  } finally {
    sendingNotification.value = false;
  }
}

async function saveSystemSettings() {
  savingSettings.value = true;

  try {
    // Aquí iría la lógica para guardar la configuración del sistema
    // Por ahora, solo simularemos el proceso

    await new Promise(resolve => setTimeout(resolve, 1000));

    alert("Configuración del sistema guardada exitosamente.");
    systemSettingsModal.hide();
  } catch (error) {
    console.error("Error al guardar configuración del sistema:", error);
    alert("Error al guardar configuración: " + error.message);
  } finally {
    savingSettings.value = false;
  }
}

function handleLogoChange(event) {
  const file = event.target.files[0];
  if (file) {
    // Aquí iría la lógica para manejar la subida del logo
    console.log("Logo seleccionado:", file.name);
  }
}

function viewBusinessDetails(business) {
  // Aquí iría la lógica para ver detalles del negocio
  console.log("Ver detalles del negocio:", business.name);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      alert("Texto copiado al portapapeles");
    })
    .catch(err => {
      console.error("Error al copiar al portapapeles:", err);
    });
}

function formatDate(timestamp) {
  if (!timestamp) return 'Fecha desconocida';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Mostrar/ocultar token y secreto
function toggleTokenVisibility() {
  showToken.value = !showToken.value;
}

function toggleSecretVisibility() {
  showSecret.value = !showSecret.value;
}

// Agregar plantilla
function addTemplate() {
  whatsappConfig.value.templates.push({
    name: `Plantilla ${whatsappConfig.value.templates.length + 1}`,
    content: ''
  });
}

// Eliminar plantilla
function removeTemplate(index) {
  whatsappConfig.value.templates.splice(index, 1);
}
</script>

<style scoped>
.dashboard {
  padding-bottom: 2rem;
}
</style>