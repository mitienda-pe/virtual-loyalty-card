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
          <h1 class="text-3xl font-bold text-gray-900 sm:text-4xl">🗑️ Eliminación de Datos de Usuario</h1>
        </div>

        <div class="bg-white shadow overflow-hidden rounded-lg">
          <div class="px-6 py-8">
            <p class="text-base text-gray-700 mb-6">Si deseas eliminar tus datos personales de Asiduo, puedes enviar un correo a: 
              <a href="mailto:eliminacion@asiduo.club" class="text-blue-600 hover:text-blue-800">eliminacion@asiduo.club</a> 
              indicando tu número de teléfono y solicitando la eliminación de tu historial de consumos.
            </p>
            
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 my-6">
              <div class="flex">
                <div class="ml-3">
                  <p class="text-sm text-blue-700">
                    <span class="font-medium">También puedes escribirnos directamente por WhatsApp con el mensaje:</span><br>
                    <span class="font-bold italic block my-3 text-blue-800">"Eliminar mis datos"</span>
                    y procesaremos tu solicitud en un plazo máximo de 7 días hábiles.
                  </p>
                </div>
              </div>
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
