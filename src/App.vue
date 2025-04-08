<!-- src/App.vue -->
<template>
  <div class="app-container">
    <div class="content-wrapper">
      <router-view />
    </div>
    
    <footer class="footer mt-auto py-3 bg-light">
      <div class="container text-center">
        <div class="footer-links">
          <router-link to="/privacy-policy" class="mx-2">Política de Privacidad</router-link>
          <span class="separator">|</span>
          <router-link to="/terms-and-conditions" class="mx-2">Términos y Condiciones</router-link>
          <span class="separator">|</span>
          <router-link to="/data-deletion" class="mx-2">Eliminación de Datos</router-link>
        </div>
        <p class="text-muted mt-2 mb-0">© 2025 Asiduo. Todos los derechos reservados.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
</script>

<style>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.content-wrapper {
  flex: 1;
}

.footer {
  padding: 1rem 0;
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.footer-links {
  margin-bottom: 0.5rem;
}

.footer-links a {
  color: #6c757d;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: #007bff;
  text-decoration: underline;
}

.separator {
  color: #ced4da;
  margin: 0 0.5rem;
}
</style>