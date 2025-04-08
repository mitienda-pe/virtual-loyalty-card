// functions/setup-cloud-tasks.js
const { createTaskQueue } = require('./src/config/createTaskQueue');

// Ejecutar la creación de la cola
console.log('Iniciando configuración de Cloud Tasks...');
createTaskQueue()
  .then(() => {
    console.log('Configuración de Cloud Tasks completada.');
    console.log('Ahora puedes desplegar tus funciones con: firebase deploy --only functions');
  })
  .catch(err => {
    console.error('Error en la configuración de Cloud Tasks:', err);
    process.exit(1);
  });
