# Virtual Loyalty Card

Sistema digital de fidelización de clientes que reemplaza las tarjetas físicas por una solución basada en WhatsApp y tarjetas virtuales.

![Loyalty Card](https://img.shields.io/badge/status-en%20desarrollo-brightgreen)
![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883)
![Firebase](https://img.shields.io/badge/Firebase-9.x-ffca28)

## 📋 Descripción

Virtual Loyalty Card es una plataforma que permite a negocios implementar programas de fidelización digitales para sus clientes. El sistema elimina la necesidad de tarjetas físicas permitiendo a los clientes acumular puntos enviando fotos de sus comprobantes de compra vía WhatsApp.

### ✨ Características Principales

- **Tarjetas digitales personalizables**: Cada negocio puede configurar su propio diseño y reglas
- **Verificación automática**: Procesamiento de comprobantes por WhatsApp usando OCR
- **Panel de administración**: Estadísticas y gestión completa para negocios
- **Sistema de roles**: Super-admin, admin de negocio y clientes
- **Integración de pagos**: Suscripciones con MercadoPago

## 🚀 Tecnologías

- **Frontend**: Vue 3 (Composition API), Vite, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage, Functions)
- **Servicios**: 
  - Google Cloud Vision API (OCR)
  - Twilio (WhatsApp Business API)
  - MercadoPago (Pasarela de pagos)

## 🔧 Instalación

### Requisitos Previos

- Node.js (v16 o superior)
- Cuentas en:
  - Firebase
  - Google Cloud Platform
  - Twilio
  - MercadoPago

### Pasos

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/virtual-loyalty-card.git
   cd virtual-loyalty-card
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` basado en `.env.example` y configura tus credenciales.

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

5. Para probar las funciones de Firebase localmente:
   ```bash
   cd functions
   npm install
   cd ..
   firebase emulators:start
   ```

## 📂 Estructura del Proyecto

```
virtual-loyalty-card/
├── src/                 # Código del frontend
│   ├── assets/          # Recursos estáticos
│   ├── components/      # Componentes reutilizables
│   ├── views/           # Páginas de la aplicación
│   ├── router/          # Configuración de rutas
│   ├── stores/          # Estado global (Pinia)
│   ├── services/        # Servicios externos
│   ├── firebase.js      # Configuración de Firebase
│   └── main.js          # Punto de entrada
├── functions/           # Funciones de Firebase
│   ├── src/             # Código de las funciones
│   └── index.js         # Punto de entrada
├── public/              # Archivos públicos
├── scripts/             # Scripts de utilidad
└── package.json         # Dependencias
```

## 💡 Cómo Funciona

1. **Para Negocios**:
   - Registrarse y elegir un plan de suscripción
   - Configurar su programa de fidelización
   - Acceder al dashboard para ver estadísticas

2. **Para Clientes**:
   - Realizar una compra y obtener un comprobante
   - Enviar una foto del comprobante por WhatsApp
   - El sistema verifica y actualiza automáticamente la tarjeta
   - Al completar las compras requeridas, obtener la recompensa

## 🔐 Seguridad

El sistema implementa varias medidas de seguridad:
- Autenticación y autorización basada en roles
- Verificación de comprobantes para evitar duplicados
- Límites de tiempo entre compras
- Validación de RUC para correspondencia con el negocio

## 🛠️ Desarrollo

### Comandos Disponibles

```bash
# Desarrollo
npm run dev

# Construir para producción
npm run build

# Vista previa de producción
npm run preview

# Desplegar en Firebase
firebase deploy
```

### Configuración de Firebase

```bash
# Inicializar Firebase
firebase login
firebase init

# Configurar variables de entorno
firebase functions:config:set mercadopago.access_token="TU_TOKEN" \
twilio.account_sid="TU_SID" \
twilio.auth_token="TU_TOKEN"
```

## 📱 Capturas de Pantalla

> Próximamente

## 📄 Licencia

Este proyecto es privado y está protegido por derechos de autor. No se permite su reproducción ni distribución sin autorización.

## ✍️ Autores

- [Tu Nombre](https://github.com/tu-usuario)

## 📞 Contacto

Para más información, puedes contactarnos en [contacto@ejemplo.com](mailto:contacto@ejemplo.com).
