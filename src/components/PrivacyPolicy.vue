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
          <h1 class="text-3xl font-bold text-gray-900 sm:text-4xl">🛡️ Política de Privacidad</h1>
          <p class="mt-3 text-base text-gray-500">Última actualización: 7 de abril de 2025</p>
        </div>

        <div class="bg-white shadow overflow-hidden rounded-lg">
          <div class="px-6 py-8">
            <p class="text-base text-gray-700 mb-6">En Asiduo (asiduo.club), valoramos tu privacidad. Esta política
              describe cómo recopilamos, usamos y protegemos tu información cuando utilizas nuestros servicios.</p>

            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">1. Información que recopilamos</h2>
              <ul class="list-disc pl-6 space-y-2 text-gray-700">
                <li>Fotos de comprobantes de pago enviadas por WhatsApp.</li>
                <li>Número de teléfono desde el cual se envía el comprobante.</li>
                <li>Datos consignados en el comprobante, como RUC, nombre de empresa, fecha, monto y número de
                  documento.</li>
              </ul>
            </div>

            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">2. Uso de la información</h2>
              <ul class="list-disc pl-6 space-y-2 text-gray-700">
                <li>Procesamos los comprobantes utilizando tecnologías de reconocimiento de texto (OCR) para identificar
                  al comercio y registrar los consumos atribuidos al usuario.</li>
                <li>Compartimos la información únicamente con el negocio afiliado al cual corresponde el comprobante.
                </li>
                <li>No vendemos ni transferimos tu información a terceros.</li>
              </ul>
            </div>

            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">3. Comunicaciones</h2>
              <ul class="list-disc pl-6 space-y-2 text-gray-700">
                <li>Utilizamos tu número de teléfono para enviarte mensajes automáticos a través de WhatsApp, con
                  información sobre tus consumos y beneficios acumulados.</li>
              </ul>
            </div>

            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">4. Almacenamiento y seguridad</h2>
              <ul class="list-disc pl-6 space-y-2 text-gray-700">
                <li>Tus datos se almacenan de forma segura en nuestros servidores y utilizamos protocolos de cifrado y
                  autenticación para protegerlos.</li>
              </ul>
            </div>

            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">5. Derechos del usuario</h2>
              <ul class="list-disc pl-6 space-y-2 text-gray-700">
                <li>Puedes solicitar la eliminación de tus datos personales en cualquier momento escribiendo a <a
                    href="mailto:eliminacion@asiduo.club"
                    class="text-blue-600 hover:text-blue-800">eliminacion@asiduo.club</a>.</li>
                <li>Si tienes preguntas, contáctanos a: <a href="mailto:privacidad@asiduo.club"
                    class="text-blue-600 hover:text-blue-800">privacidad@asiduo.club</a></li>
              </ul>
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
