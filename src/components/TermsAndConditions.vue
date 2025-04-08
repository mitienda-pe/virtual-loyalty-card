<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center">
            <img :src="logo" alt="Loyalty Card Logo" class="h-10 w-auto mr-4" />
            <h1 class="text-xl font-bold text-gray-800">Loyalty Card</h1>
          </div>
          <div>
            <router-link to="/login"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50">
              Iniciar sesión
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- Content -->
    <div class="py-12">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h1 class="text-3xl font-bold text-gray-900 sm:text-4xl">📜 Términos y Condiciones del Servicio</h1>
          <p class="mt-3 text-base text-gray-500">Última actualización: 7 de abril de 2025</p>
        </div>

        <div class="bg-white shadow overflow-hidden rounded-lg">
          <div class="px-6 py-8">
            <p class="text-base text-gray-700 mb-6">Al utilizar los servicios de Asiduo, aceptas los siguientes términos y condiciones:</p>
            
            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">1. Sobre el servicio</h2>
              <ul class="list-disc pl-6 space-y-2 text-gray-700">
                <li>Asiduo provee una plataforma tecnológica que permite a negocios crear programas de lealtad y registrar consumos de sus clientes mediante comprobantes enviados por WhatsApp.</li>
                <li>No somos responsables del cumplimiento de los beneficios u ofertas ofrecidas por los comercios afiliados.</li>
              </ul>
            </div>
            
            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">2. Uso de WhatsApp</h2>
              <ul class="list-disc pl-6 space-y-2 text-gray-700">
                <li>El envío de comprobantes y la comunicación se realiza exclusivamente a través del número oficial de Asiduo por WhatsApp.</li>
                <li>Al enviarnos un comprobante, das consentimiento para que lo procesemos y compartamos los datos con el negocio correspondiente.</li>
              </ul>
            </div>
            
            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">3. Responsabilidad del negocio afiliado</h2>
              <ul class="list-disc pl-6 space-y-2 text-gray-700">
                <li>Cada comercio afiliado es responsable de administrar su programa de beneficios, así como de cumplir con las condiciones que ofrezca a sus clientes.</li>
              </ul>
            </div>
            
            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">4. Modificaciones del servicio</h2>
              <ul class="list-disc pl-6 space-y-2 text-gray-700">
                <li>Nos reservamos el derecho de modificar, suspender o discontinuar el servicio en cualquier momento, previa notificación.</li>
              </ul>
            </div>
            
            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">5. Contacto</h2>
              <p class="text-gray-700">Si tienes alguna pregunta sobre estos términos, escríbenos a: <a href="mailto:contacto@asiduo.club" class="text-blue-600 hover:text-blue-800">contacto@asiduo.club</a></p>
            </div>
          </div>
        </div>
        
        <div class="mt-8 text-center">
          <router-link to="/"
            class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            Volver al inicio
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Using script setup to match the homepage style
import logo from '@/assets/logo.svg';
</script>
