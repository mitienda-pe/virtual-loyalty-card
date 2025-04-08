// Script ultra-simple para restaurar el rol de usuario en Firestore
// IMPORTANTE: Copia y pega este código en la consola del navegador

// Código para ejecutar en la consola del navegador
const firestore = firebase.firestore();
const auth = firebase.auth();

if (!auth.currentUser) {
  console.error('❌ No hay usuario autenticado. Debes iniciar sesión primero.');
} else {
  const uid = auth.currentUser.uid;
  const email = auth.currentUser.email;
  
  console.log(`Restaurando rol para usuario: ${email} (${uid})`);
  
  // Datos del usuario a restaurar
  const userData = {
    email: email,
    displayName: auth.currentUser.displayName || 'Administrador',
    role: 'super-admin',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  // Guardar el documento de usuario en Firestore
  firestore.collection('users').doc(uid).set(userData)
    .then(() => {
      console.log('✅ Rol de usuario restaurado correctamente como super-admin');
      console.log('Por favor, actualiza la página para que los cambios surtan efecto');
    })
    .catch(error => {
      console.error('❌ Error al restaurar el rol de usuario:', error);
    });
}
