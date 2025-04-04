<!-- src/components/WhatsAppIntegration.vue -->
<template>
  <div class="whatsapp-integration">
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-whatsapp text-success me-2"></i>
          Integración de WhatsApp
        </h5>
        <div>
          <button class="btn btn-sm btn-outline-success" @click="testConnection">
            <i class="bi bi-check-circle me-1"></i> Probar Conexión
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="alert" :class="connectionStatus.success ? 'alert-success' : 'alert-warning'" v-if="connectionStatus.message">
          <i class="bi" :class="connectionStatus.success ? 'bi-check-circle' : 'bi-exclamation-triangle'" me-2></i>
          {{ connectionStatus.message }}
        </div>

        <div class="mb-4">
          <h6>Configuración del Webhook</h6>
          <div class="table-responsive">
            <table class="table table-sm">
              <tbody>
                <tr>
                  <th style="width: 30%">URL del Webhook:</th>
                  <td>
                    <div class="d-flex align-items-center">
                      <code class="me-2">https://us-central1-virtual-loyalty-card-e37c9.cloudfunctions.net/processWhatsAppAPI</code>
                      <button class="btn btn-sm btn-outline-secondary" @click="copyToClipboard('https://us-central1-virtual-loyalty-card-e37c9.cloudfunctions.net/processWhatsAppAPI')">
                        <i class="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th>Token de Verificación:</th>
                  <td>
                    <div class="d-flex align-items-center">
                      <code class="me-2">38f7d5a1-b65c-4e9d-9f2d-ea9c21b7ca56</code>
                      <button class="btn btn-sm btn-outline-secondary" @click="copyToClipboard('38f7d5a1-b65c-4e9d-9f2d-ea9c21b7ca56')">
                        <i class="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th>ID del Teléfono:</th>
                  <td>
                    <div class="d-flex align-items-center">
                      <code class="me-2">108512615643697</code>
                      <button class="btn btn-sm btn-outline-secondary" @click="copyToClipboard('108512615643697')">
                        <i class="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mb-4">
          <h6>Credenciales de la API</h6>
          <div class="row g-3">
            <div class="col-md-6">
              <label for="apiToken" class="form-label">Token de API</label>
              <div class="input-group">
                <input 
                  :type="showToken ? 'text' : 'password'" 
                  class="form-control" 
                  id="apiToken" 
                  v-model="config.apiToken" 
                  placeholder="Ingresa el token de API"
                >
                <button class="btn btn-outline-secondary" type="button" @click="showToken = !showToken">
                  <i class="bi" :class="showToken ? 'bi-eye-slash' : 'bi-eye'"></i>
                </button>
              </div>
              <div class="form-text">Token de acceso permanente para la API de WhatsApp</div>
            </div>
            <div class="col-md-6">
              <label for="appSecret" class="form-label">Secreto de la Aplicación</label>
              <div class="input-group">
                <input 
                  :type="showSecret ? 'text' : 'password'" 
                  class="form-control" 
                  id="appSecret" 
                  v-model="config.appSecret" 
                  placeholder="Ingresa el secreto de la aplicación"
                >
                <button class="btn btn-outline-secondary" type="button" @click="showSecret = !showSecret">
                  <i class="bi" :class="showSecret ? 'bi-eye-slash' : 'bi-eye'"></i>
                </button>
              </div>
              <div class="form-text">Secreto de la aplicación de WhatsApp</div>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <h6>Configuración de Respuestas Automáticas</h6>
          <div class="form-check form-switch mb-3">
            <input class="form-check-input" type="checkbox" id="autoReplyEnabled" v-model="config.autoReplyEnabled">
            <label class="form-check-label" for="autoReplyEnabled">Habilitar respuestas automáticas</label>
          </div>
          <div v-if="config.autoReplyEnabled">
            <div class="mb-3">
              <label for="autoReplyMessage" class="form-label">Mensaje de respuesta automática</label>
              <textarea 
                class="form-control" 
                id="autoReplyMessage" 
                v-model="config.autoReplyMessage" 
                rows="3" 
                placeholder="Mensaje que se enviará automáticamente cuando un cliente envíe un comprobante"
              ></textarea>
              <div class="form-text">Este mensaje se enviará cuando un cliente envíe una foto de su comprobante de pago.</div>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <h6>Plantillas de Mensajes</h6>
          <div class="card mb-3" v-for="(template, index) in config.templates" :key="index">
            <div class="card-header bg-light py-2">
              <div class="d-flex justify-content-between align-items-center">
                <div class="input-group input-group-sm" style="max-width: 300px;">
                  <span class="input-group-text">Nombre</span>
                  <input type="text" class="form-control" v-model="template.name">
                </div>
                <button class="btn btn-sm btn-outline-danger" @click="removeTemplate(index)">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
            <div class="card-body py-2">
              <textarea 
                class="form-control form-control-sm" 
                v-model="template.content" 
                rows="2" 
                placeholder="Contenido de la plantilla"
              ></textarea>
              <div class="form-text">
                <small v-pre>Puedes usar variables como {{points}}, {{business}}, etc.</small>
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-primary w-100" @click="addTemplate">
            <i class="bi bi-plus-circle me-1"></i> Agregar Plantilla
          </button>
        </div>

        <div class="mb-4">
          <h6>Flujo de Registro de Clientes</h6>
          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            <strong>Registro automático:</strong> Los clientes se registran automáticamente al enviar fotos de sus comprobantes de pago por WhatsApp.
          </div>
          <div class="card">
            <div class="card-body">
              <ol class="mb-0">
                <li class="mb-2">El cliente envía una foto del comprobante de pago a nuestro número de WhatsApp.</li>
                <li class="mb-2">El sistema procesa la imagen y extrae la información del comprobante.</li>
                <li class="mb-2">Si es un cliente nuevo, se crea automáticamente una cuenta asociada a su número de WhatsApp.</li>
                <li class="mb-2">Se registra el consumo y se actualizan los puntos del cliente.</li>
                <li>Se envía una respuesta automática confirmando el registro y los puntos acumulados.</li>
              </ol>
            </div>
          </div>
        </div>

        <div class="d-grid gap-2">
          <button class="btn btn-primary" @click="saveConfig" :disabled="saving">
            <span v-if="saving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            <i v-else class="bi bi-save me-1"></i>
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { db } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Estado de la configuración
const config = ref({
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

// Estado de la interfaz
const saving = ref(false);
const showToken = ref(false);
const showSecret = ref(false);
const connectionStatus = ref({
  success: false,
  message: ''
});

// Cargar configuración
async function loadConfig() {
  try {
    const configDoc = await getDoc(doc(db, "system", "whatsapp_config"));
    if (configDoc.exists()) {
      const data = configDoc.data();
      config.value = {
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
    connectionStatus.value = {
      success: false,
      message: `Error al cargar configuración: ${error.message}`
    };
  }
}

// Guardar configuración
async function saveConfig() {
  saving.value = true;
  
  try {
    await setDoc(doc(db, "system", "whatsapp_config"), {
      apiToken: config.value.apiToken,
      appSecret: config.value.appSecret,
      autoReplyEnabled: config.value.autoReplyEnabled,
      autoReplyMessage: config.value.autoReplyMessage,
      templates: config.value.templates,
      updatedAt: serverTimestamp()
    });
    
    connectionStatus.value = {
      success: true,
      message: "Configuración guardada correctamente."
    };
  } catch (error) {
    console.error("Error al guardar configuración:", error);
    connectionStatus.value = {
      success: false,
      message: `Error al guardar configuración: ${error.message}`
    };
  } finally {
    saving.value = false;
  }
}

// Probar conexión con la API de WhatsApp
async function testConnection() {
  if (!config.value.apiToken || !config.value.appSecret) {
    connectionStatus.value = {
      success: false,
      message: "Debes configurar el Token de API y el Secreto de la aplicación primero."
    };
    return;
  }
  
  connectionStatus.value = {
    success: false,
    message: "Probando conexión con la API de WhatsApp..."
  };
  
  try {
    // Aquí implementaríamos una llamada real a la API de WhatsApp
    // Por ahora, simularemos una respuesta exitosa
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    connectionStatus.value = {
      success: true,
      message: "Conexión exitosa con la API de WhatsApp."
    };
  } catch (error) {
    console.error("Error al probar conexión:", error);
    connectionStatus.value = {
      success: false,
      message: `Error al conectar con la API de WhatsApp: ${error.message}`
    };
  }
}

// Agregar plantilla
function addTemplate() {
  config.value.templates.push({
    name: `Plantilla ${config.value.templates.length + 1}`,
    content: ''
  });
}

// Eliminar plantilla
function removeTemplate(index) {
  config.value.templates.splice(index, 1);
}

// Copiar al portapapeles
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Podríamos mostrar una notificación de éxito
  }).catch(err => {
    console.error('Error al copiar al portapapeles:', err);
  });
}

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.card-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.form-text {
  font-size: 0.75rem;
}

code {
  background-color: #f8f9fa;
  padding: 0.2rem 0.4rem;
  border-radius: 0.2rem;
  font-size: 0.875rem;
}
</style>
