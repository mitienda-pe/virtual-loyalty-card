# Scripts de Desarrollo

Esta carpeta contiene scripts de utilidad para el desarrollo y mantenimiento de la aplicación.

## restoreCollections.js

Script para restaurar las colecciones básicas de Firestore cuando se pierde la información de la base de datos.

**Uso:**
1. Abrir la consola del navegador en la aplicación Vue
2. Copiar y pegar el contenido del archivo
3. Ejecutar en la consola

**Propósito:**
- Restaurar colección de negocios (businesses)
- Restaurar mapeo de RUC a slug (ruc_business_map)
- Crear colecciones vacías necesarias

## restoreUserRole.js

Script para restaurar el rol de administrador de un usuario cuando se pierde la información del perfil.

**Uso:**
1. Iniciar sesión en la aplicación
2. Abrir la consola del navegador
3. Copiar y pegar el contenido del archivo
4. Ejecutar en la consola

**Propósito:**
- Restaurar rol de super-admin
- Actualizar información de perfil
- Restablecer permisos de administrador

## Notas Importantes

- Estos scripts están diseñados para ser ejecutados manualmente en la consola del navegador
- Solo deben ser utilizados por desarrolladores o administradores del sistema
- Siempre hacer backup de la base de datos antes de ejecutar scripts de restauración
