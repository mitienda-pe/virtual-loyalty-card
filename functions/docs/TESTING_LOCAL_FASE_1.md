# Testing Local - FASE 1: Múltiples Entidades

## 🚀 Instrucciones de Uso

### Prerrequisitos

1. **Iniciar el emulador de Firebase:**
```bash
# En una terminal separada (mantener abierta)
firebase emulators:start --only firestore
```

2. **Instalar dependencias:**
```bash
cd functions
npm install
```

### 🔧 Scripts Disponibles

#### 1. Migración Local
```bash
# Ejecutar migración completa en emulador local
npm run migrate:entities:local
```

**Lo que hace:**
- ✅ Crea datos de prueba iniciales (3 negocios)
- ✅ Migra negocios al formato de múltiples entidades
- ✅ Actualiza `ruc_business_map` con `entityId`
- ✅ Crea negocio McDonald's de ejemplo con 2 entidades
- ✅ Verifica que la migración sea exitosa

#### 2. Tests Locales
```bash
# Ejecutar todos los tests en emulador local
npm run test:entities:local
```

**Tests incluidos:**
- ✅ Compatibilidad hacia atrás con `findBusinessByRUC`
- ✅ Búsqueda con múltiples entidades
- ✅ CRUD completo de entidades (agregar, actualizar, eliminar)
- ✅ Validación de unicidad de RUC
- ✅ Obtener entidad específica y todas las entidades

### 📋 Flujo Completo de Testing

1. **Iniciar emulador:**
```bash
firebase emulators:start --only firestore
```

2. **Ejecutar migración (terminal nueva):**
```bash
cd functions
npm run migrate:entities:local
```

3. **Ejecutar tests:**
```bash
npm run test:entities:local
```

### 📊 Ejemplo de Salida Exitosa

```
🚀 MIGRACIÓN LOCAL - FASE 1: Múltiples Entidades Comerciales
======================================================================

🛠️ Creando datos de prueba iniciales...
   ✅ Negocio creado: la-baguette (RUC: 20504680623)
   ✅ Negocio creado: starbucks-test (RUC: 20123456789)
   ✅ Negocio creado: restaurant-test (RUC: 20987654321)
✅ Datos de prueba iniciales creados

🚀 Iniciando migración a múltiples entidades comerciales...
📊 Encontrados 3 negocios para migrar

📋 Procesando negocio 1/3: la-baguette
   Nombre: La Baguette
   ✅ Migrado a formato de múltiples entidades

[... más salida ...]

🎉 Migración local FASE 1 completada exitosamente
```

### 🧪 Estructura de Datos Creada

Después de ejecutar la migración, tendrás:

#### Negocios con Formato Anterior Migrado:
- **La Baguette** (RUC: 20504680623)
- **Starbucks Test** (RUC: 20123456789) 
- **Restaurant Test** (RUC: 20987654321)

#### Negocio con Múltiples Entidades:
- **McDonald's Sample**
  - Entidad 1: McDonald's Peru S.A.C. (RUC: 20999888777)
  - Entidad 2: Arcos Dorados Restaurantes S.A.C. (RUC: 20777666555)

### 🐛 Solución de Problemas

#### Error: "Could not load the default credentials"
**Solución:** Usar scripts locales que no requieren autenticación:
```bash
npm run migrate:entities:local
npm run test:entities:local
```

#### Error: "ECONNREFUSED localhost:8080"
**Solución:** Asegúrate de que el emulador esté ejecutándose:
```bash
firebase emulators:start --only firestore
```

#### Tests fallan por datos inexistentes
**Solución:** Ejecutar migración primero:
```bash
npm run migrate:entities:local
npm run test:entities:local
```

### 🔄 Limpiar Datos

Para limpiar el emulador y empezar de nuevo:
1. Detener el emulador (Ctrl+C)
2. Reiniciar: `firebase emulators:start --only firestore`
3. Ejecutar migración: `npm run migrate:entities:local`

### ✅ Criterios de Éxito

Si todo funciona correctamente, deberías ver:

**Migración:**
- ✅ 3+ negocios migrados
- ✅ 0 errores de validación
- ✅ McDonald's creado con 2 entidades

**Tests:**
- ✅ 8/8 tests pasados
- ✅ Test de integración exitoso
- ✅ Todas las validaciones funcionando

### 🚀 Próximos Pasos

Una vez que los tests locales pasen exitosamente:

1. **Para producción:** Usar scripts con autenticación real
2. **Proceder con FASE 2:** Actualizar procesamiento de compras
3. **Desarrollar frontend:** Crear interfaz para gestionar entidades

## 📞 Soporte

Si encuentras problemas, revisa:
1. Que el emulador esté ejecutándose en puerto 8080
2. Que hayas ejecutado la migración antes de los tests
3. Los logs detallados para identificar errores específicos
