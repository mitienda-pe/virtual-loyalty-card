<!-- src/views/admin/WhatsAppConfig.vue -->
<template>
  <div class="container-fluid">
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h1 class="h3 mb-0">Configuración de WhatsApp</h1>
                <p class="text-muted">Gestiona la integración con WhatsApp para el registro automático de clientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-8">
        <!-- Componente de integración de WhatsApp -->
        <WhatsAppIntegration />
      </div>

      <div class="col-lg-4">
        <!-- Tarjeta de ayuda -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-white">
            <h5 class="card-title mb-0">Información de Ayuda</h5>
          </div>
          <div class="card-body">
            <div class="alert alert-info mb-3">
              <i class="bi bi-info-circle me-2"></i>
              <strong>Registro automático:</strong> Los clientes se registran automáticamente al enviar fotos de sus comprobantes de pago por WhatsApp.
            </div>

            <h6 class="fw-bold mb-2">Pasos para configurar WhatsApp:</h6>
            <ol class="mb-3">
              <li class="mb-2">Configura el webhook en la plataforma de desarrolladores de WhatsApp.</li>
              <li class="mb-2">Ingresa el token de API y el secreto de la aplicación.</li>
              <li class="mb-2">Configura las plantillas de mensajes para comunicarte con los clientes.</li>
              <li>Prueba la conexión para verificar que todo funcione correctamente.</li>
            </ol>

            <h6 class="fw-bold mb-2">Flujo de registro de clientes:</h6>
            <div class="card bg-light">
              <div class="card-body p-3">
                <div class="d-flex mb-2">
                  <div class="me-2">
                    <span class="badge bg-primary rounded-circle">1</span>
                  </div>
                  <div>
                    <strong>Cliente envía comprobante</strong>
                    <p class="mb-0 small text-muted">El cliente toma una foto de su comprobante de pago y la envía por WhatsApp.</p>
                  </div>
                </div>
                <div class="d-flex mb-2">
                  <div class="me-2">
                    <span class="badge bg-primary rounded-circle">2</span>
                  </div>
                  <div>
                    <strong>Procesamiento automático</strong>
                    <p class="mb-0 small text-muted">El sistema procesa la imagen y extrae la información del comprobante.</p>
                  </div>
                </div>
                <div class="d-flex mb-2">
                  <div class="me-2">
                    <span class="badge bg-primary rounded-circle">3</span>
                  </div>
                  <div>
                    <strong>Registro de cliente</strong>
                    <p class="mb-0 small text-muted">Si es un cliente nuevo, se crea automáticamente una cuenta asociada a su número de WhatsApp.</p>
                  </div>
                </div>
                <div class="d-flex mb-2">
                  <div class="me-2">
                    <span class="badge bg-primary rounded-circle">4</span>
                  </div>
                  <div>
                    <strong>Actualización de puntos</strong>
                    <p class="mb-0 small text-muted">Se registra el consumo y se actualizan los puntos del cliente.</p>
                  </div>
                </div>
                <div class="d-flex">
                  <div class="me-2">
                    <span class="badge bg-primary rounded-circle">5</span>
                  </div>
                  <div>
                    <strong>Respuesta automática</strong>
                    <p class="mb-0 small text-muted">Se envía una confirmación con los puntos acumulados.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tarjeta de recursos -->
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white">
            <h5 class="card-title mb-0">Recursos Útiles</h5>
          </div>
          <div class="card-body">
            <div class="list-group list-group-flush">
              <a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" class="list-group-item list-group-item-action d-flex align-items-center">
                <i class="bi bi-file-earmark-text me-2 text-primary"></i>
                Documentación de WhatsApp Cloud API
              </a>
              <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components" target="_blank" class="list-group-item list-group-item-action d-flex align-items-center">
                <i class="bi bi-gear me-2 text-primary"></i>
                Configuración de Webhooks
              </a>
              <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages" target="_blank" class="list-group-item list-group-item-action d-flex align-items-center">
                <i class="bi bi-chat-dots me-2 text-primary"></i>
                Referencia de Mensajes
              </a>
              <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages" target="_blank" class="list-group-item list-group-item-action d-flex align-items-center">
                <i class="bi bi-send me-2 text-primary"></i>
                Guía para Enviar Mensajes
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import WhatsAppIntegration from '@/components/WhatsAppIntegration.vue';
</script>

<style scoped>
.badge.rounded-circle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-title {
  font-weight: 600;
}
</style>
