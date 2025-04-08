// functions/src/utils/userRestore.js
const admin = require('firebase-admin');

// Inicializar Firebase si aún no está inicializado
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
} catch (e) {
  // App ya inicializada
}

const auth = admin.auth();
const db = admin.firestore();

/**
 * Restaura un usuario administrador básico para permitir el inicio de sesión
 */
async function restoreAdminUser(email, password) {
  try {
    console.log(`Intentando crear usuario administrador: ${email}`);
    
    // Crear usuario en Authentication
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        emailVerified: true,
        disabled: false
      });
      console.log(`✅ Usuario creado con UID: ${userRecord.uid}`);
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        console.log(`Usuario ya existe, obteniendo información...`);
        userRecord = await auth.getUserByEmail(email);
        console.log(`✅ Usuario encontrado con UID: ${userRecord.uid}`);
      } else {
        throw authError;
      }
    }
    
    // Crear documento en la colección 'users'
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      role: 'admin',
      displayName: 'Administrador',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Documento de usuario creado/actualizado en Firestore`);
    return userRecord;
  } catch (error) {
    console.error('❌ Error restaurando usuario administrador:', error);
    throw error;
  }
}

// Ejecutar la restauración con el email que proporciones
// Reemplaza 'admin@example.com' y 'password123' con tus credenciales reales
restoreAdminUser('chiste@gmail.com', 'temporal123')
  .then(user => {
    console.log('✅ Restauración de usuario administrador completada');
    console.log('Usuario:', user);
  })
  .catch(error => {
    console.error('❌ Error en la restauración:', error);
  });
