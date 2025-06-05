# Arquitectura de Múltiples Programas de Lealtad - Virtual Loyalty Card

## Descripción General

Este documento describe la arquitectura propuesta para implementar múltiples tipos de programas de lealtad en la aplicación Virtual Loyalty Card, permitiendo que los negocios ejecuten campañas simultáneas con diferentes criterios y recompensas.

## Casos de Uso Identificados

### Problemas Actual del Sistema
- **Limitación a visitas únicamente**: Solo premia la frecuencia de visitas
- **Falta de segmentación**: No considera el valor del ticket o productos específicos
- **Programas únicos**: No permite múltiples campañas simultáneas
- **Falta de flexibilidad**: No soporta diferentes tipos de incentivos

### Necesidades del Cliente
- Premiar consumo de productos específicos (plato del día, nuevos productos)
- Recompensar según el valor del ticket (hamburguesa por hamburguesas)
- Ejecutar múltiples campañas en paralelo
- Sistema de puntos como aerolíneas
- Control de prioridades en los canjes

## Tipos de Programas de Lealtad

### 1. Programa por Visitas (Actual)
**Descripción**: Premia la frecuencia de visitas independientemente del consumo.

```javascript
{
  type: 'visits',
  name: 'Café Gratis por Visitas',
  target: 10, // número de visitas
  reward: 'Café gratis',
  priority: 3
}
```

### 2. Programa por Producto Específico
**Descripción**: Premia el consumo de productos específicos identificados por palabras clave en el OCR.

```javascript
{
  type: 'specific_product',
  name: 'Promoción Plato del Día',
  target: 6, // consumos del producto específico
  productKeywords: ['plato del día', 'especial del día', 'menú ejecutivo'],
  reward: 'Postre gratis',
  priority: 1
}
```

### 3. Programa por Valor de Ticket
**Descripción**: Premia tickets que superen un monto mínimo, ideal para segmentar por poder adquisitivo.

```javascript
{
  type: 'ticket_value',
  name: 'Hamburguesa por Consumo Premium',
  target: 5, // tickets que cumplan la condición
  minTicketValue: 25, // valor mínimo del ticket
  reward: 'Hamburguesa gratis',
  priority: 2
}
```

### 4. Programa por Puntos
**Descripción**: Sistema de acumulación de puntos basado en el monto gastado, con múltiples niveles de canje.

```javascript
{
  type: 'points',
  name: 'Programa de Puntos VIP',
  pointsPerDollar: 1, // 1 punto por cada dólar gastado
  rewards: [
    { points: 100, reward: 'Café gratis' },
    { points: 500, reward: 'Hamburguesa gratis' },
    { points: 1000, reward: 'Combo completo' }
  ],
  priority: 4
}
```

## Arquitectura de Datos

### Estructura de Programas de Lealtad

```javascript
// Colección: businesses/{businessId}/loyaltyPrograms
const loyaltyProgram = {
  id: 'program_123',
  businessId: 'business_456',
  name: 'Promoción Hamburguesas Premium',
  description: 'Compra 5 hamburguesas premium y llévate la 6ta gratis',
  type: 'specific_product', // 'visits', 'specific_product', 'ticket_value', 'points'
  status: 'active', // 'active', 'paused', 'ended'
  priority: 1, // Orden de evaluación (1 = mayor prioridad)
  
  // Configuración específica según el tipo
  config: {
    target: 5,
    productKeywords: ['hamburguesa premium', 'angus', 'gourmet'],
    minTicketValue: 30,
    pointsPerDollar: 1,
    reward: 'Hamburguesa Premium gratis',
    rewards: [] // Para programas de puntos con múltiples niveles
  },
  
  // Fechas de validez
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  
  // Restricciones adicionales
  restrictions: {
    maxRedemptionsPerCustomer: 2, // máximo 2 canjes por cliente
    maxRedemptionsPerMonth: 1, // máximo 1 canje por mes por cliente
    validDays: [1, 2, 3, 4, 5], // 1=lunes, 7=domingo
    validHours: { start: '10:00', end: '22:00' }
  },
  
  // Estadísticas
  stats: {
    totalParticipants: 0,
    rewardsRedeemed: 0,
    totalRevenue: 0,
    averageTicketValue: 0
  },
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Progreso del Cliente

```javascript
// Colección: customers/{customerId}/loyaltyProgress
const customerProgress = {
  customerId: 'customer_789',
  businessId: 'business_456',
  programs: {
    'program_123': {
      type: 'specific_product',
      currentCount: 3,
      target: 5,
      progress: 0.6, // 3/5 = 60%
      canRedeem: false,
      history: [
        { date: '2025-01-15', ticketId: 'ticket_001', increment: 1 },
        { date: '2025-01-20', ticketId: 'ticket_002', increment: 1 },
        { date: '2025-01-25', ticketId: 'ticket_003', increment: 1 }
      ],
      lastUpdate: timestamp,
      redemptions: [] // histórico de canjes
    },
    'program_456': {
      type: 'points',
      currentPoints: 850,
      totalPointsEarned: 1200,
      availableRewards: [
        { points: 100, reward: 'Café gratis', canRedeem: true },
        { points: 500, reward: 'Hamburguesa gratis', canRedeem: true },
        { points: 1000, reward: 'Combo completo', canRedeem: false }
      ],
      lastUpdate: timestamp,
      redemptions: [
        { date: '2025-01-10', points: 350, reward: 'Combo medio' }
      ]
    }
  },
  totalLifetimeValue: 450.75, // valor total gastado por el cliente
  lastVisit: timestamp
}
```

## Lógica de Procesamiento

### Función Principal de Procesamiento

```javascript
/**
 * Procesa un ticket para todos los programas de lealtad activos
 * @param {Object} ticketData - Datos extraídos del ticket por OCR
 * @param {Object} customer - Información del cliente
 * @param {Object} business - Información del negocio
 */
async function processTicketForLoyalty(ticketData, customer, business) {
  try {
    // Obtener todos los programas activos ordenados por prioridad
    const activePrograms = await getActivePrograms(business.id);
    
    // Validar que el ticket no haya sido procesado anteriormente
    const isDuplicate = await checkDuplicateTicket(ticketData.ticketId, customer.id);
    if (isDuplicate) {
      throw new Error('Ticket ya procesado anteriormente');
    }
    
    // Procesar cada programa según su tipo
    const results = [];
    for (const program of activePrograms) {
      const result = await processProgram(program, customer, ticketData);
      results.push(result);
    }
    
    // Notificar al cliente sobre recompensas disponibles
    await notifyAvailableRewards(customer, business);
    
    return results;
  } catch (error) {
    console.error('Error processing loyalty programs:', error);
    throw error;
  }
}

/**
 * Procesa un programa específico según su tipo
 */
async function processProgram(program, customer, ticketData) {
  switch (program.type) {
    case 'visits':
      return await processVisitProgram(program, customer, ticketData);
    case 'specific_product':
      return await processSpecificProductProgram(program, customer, ticketData);
    case 'ticket_value':
      return await processTicketValueProgram(program, customer, ticketData);
    case 'points':
      return await processPointsProgram(program, customer, ticketData);
    default:
      throw new Error(`Tipo de programa no soportado: ${program.type}`);
  }
}
```

### Procesamiento por Tipo de Programa

```javascript
/**
 * Procesa programa de producto específico
 */
async function processSpecificProductProgram(program, customer, ticketData) {
  // Verificar si el ticket contiene el producto específico
  const hasTargetProduct = program.config.productKeywords.some(keyword => 
    ticketData.items.some(item => 
      item.description.toLowerCase().includes(keyword.toLowerCase())
    )
  );
  
  if (hasTargetProduct) {
    // Incrementar progreso
    await incrementProgramProgress(customer.id, program.id, 1);
    
    // Verificar si puede canjear
    const progress = await getCustomerProgress(customer.id, program.id);
    if (progress.currentCount >= program.config.target) {
      await setRewardAvailable(customer.id, program.id);
      return { eligible: true, canRedeem: true, progress: progress.currentCount };
    }
    
    return { eligible: true, canRedeem: false, progress: progress.currentCount };
  }
  
  return { eligible: false, canRedeem: false, progress: 0 };
}

/**
 * Procesa programa de valor de ticket
 */
async function processTicketValueProgram(program, customer, ticketData) {
  const meetsMinimum = ticketData.total >= program.config.minTicketValue;
  
  if (meetsMinimum) {
    await incrementProgramProgress(customer.id, program.id, 1);
    
    const progress = await getCustomerProgress(customer.id, program.id);
    if (progress.currentCount >= program.config.target) {
      await setRewardAvailable(customer.id, program.id);
      return { eligible: true, canRedeem: true, progress: progress.currentCount };
    }
    
    return { eligible: true, canRedeem: false, progress: progress.currentCount };
  }
  
  return { eligible: false, canRedeem: false, progress: 0 };
}

/**
 * Procesa programa de puntos
 */
async function processPointsProgram(program, customer, ticketData) {
  const pointsEarned = Math.floor(ticketData.total * program.config.pointsPerDollar);
  
  if (pointsEarned > 0) {
    await addPointsToCustomer(customer.id, program.id, pointsEarned);
    
    const progress = await getCustomerProgress(customer.id, program.id);
    const availableRewards = program.config.rewards.filter(
      reward => progress.currentPoints >= reward.points
    );
    
    return { 
      eligible: true, 
      pointsEarned, 
      totalPoints: progress.currentPoints,
      availableRewards 
    };
  }
  
  return { eligible: false, pointsEarned: 0 };
}
```

### Sistema de Prioridades para Canjes

```javascript
/**
 * Obtiene las recompensas disponibles para un cliente ordenadas por prioridad
 */
async function getAvailableRewards(customerId, businessId) {
  const programs = await getActivePrograms(businessId);
  const availableRewards = [];
  
  // Ordenar por prioridad (1 = mayor prioridad)
  programs.sort((a, b) => a.priority - b.priority);
  
  for (const program of programs) {
    const progress = await getCustomerProgress(customerId, program.id);
    
    if (canRedeem(progress, program)) {
      availableRewards.push({
        programId: program.id,
        programName: program.name,
        reward: program.config.reward,
        priority: program.priority,
        type: program.type
      });
    }
  }
  
  return availableRewards;
}

/**
 * Procesa el canje de una recompensa
 */
async function processRedemption(customerId, programId, businessId) {
  const program = await getLoyaltyProgram(businessId, programId);
  const progress = await getCustomerProgress(customerId, programId);
  
  // Verificar que puede canjear
  if (!canRedeem(progress, program)) {
    throw new Error('No cumple los requisitos para canjear');
  }
  
  // Verificar restricciones
  await validateRedemptionRestrictions(customerId, program);
  
  // Procesar canje
  await executeRedemption(customerId, program);
  
  // Generar código de canje
  const redemptionCode = generateRedemptionCode();
  
  // Guardar registro de canje
  await saveRedemptionRecord(customerId, program, redemptionCode);
  
  return { 
    success: true, 
    redemptionCode, 
    reward: program.config.reward 
  };
}
```

## Interfaz de Usuario

### Dashboard del Business Owner

```vue
<template>
  <div class="loyalty-programs-manager">
    <!-- Header -->
    <div class="page-header">
      <h1>Programas de Lealtad</h1>
      <button @click="showCreateProgram = true" class="btn-primary">
        + Crear Nuevo Programa
      </button>
    </div>
    
    <!-- Estadísticas Generales -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Programas Activos</h3>
        <span class="stat-number">{{ activePrograms.length }}</span>
      </div>
      <div class="stat-card">
        <h3>Total Participantes</h3>
        <span class="stat-number">{{ totalParticipants }}</span>
      </div>
      <div class="stat-card">
        <h3>Canjes Este Mes</h3>
        <span class="stat-number">{{ monthlyRedemptions }}</span>
      </div>
    </div>
    
    <!-- Lista de Programas (Ordenables) -->
    <div class="programs-section">
      <h2>Orden de Prioridad</h2>
      <p class="help-text">
        Arrastra los programas para cambiar su prioridad. Los programas con mayor prioridad se evalúan primero al momento del canje.
      </p>
      
      <draggable 
        v-model="programs" 
        @end="updatePriorities"
        item-key="id"
        class="programs-list"
      >
        <template #item="{element: program}">
          <div class="program-card" :class="{ inactive: program.status !== 'active' }">
            <div class="drag-handle">⋮⋮</div>
            
            <div class="program-info">
              <div class="program-header">
                <h3>{{ program.name }}</h3>
                <span class="program-type-badge" :class="program.type">
                  {{ getProgramTypeLabel(program.type) }}
                </span>
              </div>
              
              <p class="program-description">{{ program.description }}</p>
              
              <div class="program-details">
                <span class="detail-item">
                  <i class="icon-target"></i>
                  {{ getProgramTargetText(program) }}
                </span>
                <span class="detail-item">
                  <i class="icon-gift"></i>
                  {{ program.config.reward }}
                </span>
                <span class="detail-item">
                  <i class="icon-calendar"></i>
                  {{ formatDateRange(program.startDate, program.endDate) }}
                </span>
              </div>
              
              <div class="program-stats">
                <span>{{ program.stats.totalParticipants }} participantes</span>
                <span>{{ program.stats.rewardsRedeemed }} canjes</span>
                <span>${{ program.stats.totalRevenue.toFixed(2) }} generados</span>
              </div>
            </div>
            
            <div class="program-actions">
              <button @click="viewProgramDetails(program)" class="btn-secondary">
                Ver Detalles
              </button>
              <button @click="editProgram(program)" class="btn-secondary">
                Editar
              </button>
              <button 
                @click="toggleProgram(program)" 
                :class="program.status === 'active' ? 'btn-warning' : 'btn-success'"
              >
                {{ program.status === 'active' ? 'Pausar' : 'Activar' }}
              </button>
            </div>
          </div>
        </template>
      </draggable>
    </div>
    
    <!-- Modal de Creación/Edición -->
    <ProgramModal 
      v-if="showCreateProgram || editingProgram"
      :program="editingProgram"
      @save="saveProgram"
      @cancel="cancelEdit"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLoyaltyStore } from '@/stores/loyalty'
import draggable from 'vuedraggable'
import ProgramModal from '@/components/ProgramModal.vue'

const loyaltyStore = useLoyaltyStore()
const programs = ref([])
const showCreateProgram = ref(false)
const editingProgram = ref(null)

const activePrograms = computed(() => 
  programs.value.filter(p => p.status === 'active')
)

const totalParticipants = computed(() => 
  programs.value.reduce((sum, p) => sum + p.stats.totalParticipants, 0)
)

const monthlyRedemptions = computed(() => 
  programs.value.reduce((sum, p) => sum + p.stats.rewardsRedeemed, 0)
)

onMounted(async () => {
  programs.value = await loyaltyStore.getBusinessPrograms()
})

const updatePriorities = async () => {
  // Actualizar prioridades basado en el nuevo orden
  const updates = programs.value.map((program, index) => ({
    id: program.id,
    priority: index + 1
  }))
  
  await loyaltyStore.updateProgramPriorities(updates)
}

const getProgramTypeLabel = (type) => {
  const labels = {
    'visits': 'Por Visitas',
    'specific_product': 'Por Producto',
    'ticket_value': 'Por Valor',
    'points': 'Por Puntos'
  }
  return labels[type] || type
}

const getProgramTargetText = (program) => {
  switch (program.type) {
    case 'visits':
      return `${program.config.target} visitas`
    case 'specific_product':
      return `${program.config.target} productos específicos`
    case 'ticket_value':
      return `${program.config.target} compras de $${program.config.minTicketValue}+`
    case 'points':
      return `Sistema de puntos (${program.config.pointsPerDollar} pts/$)`
    default:
      return 'N/A'
  }
}
</script>
```

### Modal de Creación/Edición de Programas

```vue
<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ isEditing ? 'Editar Programa' : 'Crear Nuevo Programa' }}</h2>
        <button @click="$emit('cancel')" class="close-btn">×</button>
      </div>
      
      <form @submit.prevent="saveProgram" class="program-form">
        <!-- Información Básica -->
        <div class="form-section">
          <h3>Información Básica</h3>
          
          <div class="form-group">
            <label>Nombre del Programa</label>
            <input 
              v-model="form.name" 
              type="text" 
              required 
              placeholder="Ej: Promoción Plato del Día"
            >
          </div>
          
          <div class="form-group">
            <label>Descripción</label>
            <textarea 
              v-model="form.description" 
              placeholder="Describe cómo funciona el programa..."
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>Tipo de Programa</label>
            <select v-model="form.type" @change="resetConfig">
              <option value="visits">Por Visitas</option>
              <option value="specific_product">Por Producto Específico</option>
              <option value="ticket_value">Por Valor de Ticket</option>
              <option value="points">Por Puntos</option>
            </select>
          </div>
        </div>
        
        <!-- Configuración Específica -->
        <div class="form-section">
          <h3>Configuración del Programa</h3>
          
          <!-- Configuración para Visitas -->
          <div v-if="form.type === 'visits'" class="config-section">
            <div class="form-group">
              <label>Número de Visitas Requeridas</label>
              <input v-model.number="form.config.target" type="number" min="1" required>
            </div>
            <div class="form-group">
              <label>Recompensa</label>
              <input v-model="form.config.reward" type="text" required placeholder="Ej: Café gratis">
            </div>
          </div>
          
          <!-- Configuración para Producto Específico -->
          <div v-if="form.type === 'specific_product'" class="config-section">
            <div class="form-group">
              <label>Número de Productos Requeridos</label>
              <input v-model.number="form.config.target" type="number" min="1" required>
            </div>
            <div class="form-group">
              <label>Palabras Clave del Producto</label>
              <input 
                v-model="keywordsInput" 
                type="text" 
                placeholder="Ej: plato del día, especial, menú ejecutivo"
                @input="updateKeywords"
              >
              <small class="help-text">Separa las palabras clave con comas</small>
            </div>
            <div class="form-group">
              <label>Recompensa</label>
              <input v-model="form.config.reward" type="text" required placeholder="Ej: Postre gratis">
            </div>
          </div>
          
          <!-- Configuración para Valor de Ticket -->
          <div v-if="form.type === 'ticket_value'" class="config-section">
            <div class="form-group">
              <label>Número de Tickets Requeridos</label>
              <input v-model.number="form.config.target" type="number" min="1" required>
            </div>
            <div class="form-group">
              <label>Valor Mínimo del Ticket ($)</label>
              <input v-model.number="form.config.minTicketValue" type="number" min="0" step="0.01" required>
            </div>
            <div class="form-group">
              <label>Recompensa</label>
              <input v-model="form.config.reward" type="text" required placeholder="Ej: Hamburguesa gratis">
            </div>
          </div>
          
          <!-- Configuración para Puntos -->
          <div v-if="form.type === 'points'" class="config-section">
            <div class="form-group">
              <label>Puntos por Dólar Gastado</label>
              <input v-model.number="form.config.pointsPerDollar" type="number" min="0.1" step="0.1" required>
            </div>
            <div class="form-group">
              <label>Niveles de Recompensa</label>
              <div class="rewards-list">
                <div 
                  v-for="(reward, index) in form.config.rewards" 
                  :key="index" 
                  class="reward-item"
                >
                  <input 
                    v-model.number="reward.points" 
                    type="number" 
                    placeholder="Puntos" 
                    min="1"
                  >
                  <input 
                    v-model="reward.reward" 
                    type="text" 
                    placeholder="Recompensa"
                  >
                  <button @click="removeReward(index)" type="button" class="btn-danger">×</button>
                </div>
                <button @click="addReward" type="button" class="btn-secondary">
                  + Agregar Nivel
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Fechas de Validez -->
        <div class="form-section">
          <h3>Validez del Programa</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Fecha de Inicio</label>
              <input v-model="form.startDate" type="date" required>
            </div>
            <div class="form-group">
              <label>Fecha de Fin</label>
              <input v-model="form.endDate" type="date" required>
            </div>
          </div>
        </div>
        
        <!-- Acciones -->
        <div class="modal-actions">
          <button type="button" @click="$emit('cancel')" class="btn-secondary">
            Cancelar
          </button>
          <button type="submit" class="btn-primary">
            {{ isEditing ? 'Actualizar' : 'Crear' }} Programa
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
```

## Implementación en Cloud Functions

### Función Principal

```javascript
// functions/src/loyaltyProcessor.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.processLoyaltyPrograms = functions.firestore
  .document('tickets/{ticketId}')
  .onCreate(async (snap, context) => {
    const ticketData = snap.data();
    const ticketId = context.params.ticketId;
    
    try {
      // Obtener información del cliente y negocio
      const customer = await getCustomerInfo(ticketData.customerId);
      const business = await getBusinessInfo(ticketData.businessId);
      
      // Procesar programas de lealtad
      const results = await processTicketForLoyalty(ticketData, customer, business);
      
      // Actualizar documento del ticket con los resultados
      await snap.ref.update({
        loyaltyProcessed: true,
        loyaltyResults: results,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Loyalty programs processed for ticket ${ticketId}:`, results);
      
    } catch (error) {
      console.error(`Error processing loyalty for ticket ${ticketId}:`, error);
      
      // Marcar como error para retry manual
      await snap.ref.update({
        loyaltyProcessed: false,
        loyaltyError: error.message,
        errorAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });
```

## Reglas de Seguridad de Firebase

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Programas de lealtad - solo el owner del negocio puede modificar
    match /businesses/{businessId}/loyaltyPrograms/{programId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.uid == resource.data.ownerId;
    }
    
    // Progreso de clientes - el cliente puede leer su propio progreso
    match /customers/{customerId}/loyaltyProgress/{progressId} {
      allow read: if request.auth != null && 
                     request.auth.uid == customerId;
      allow write: if false; // Solo las Cloud Functions pueden escribir
    }
    
    // Canjes - el cliente puede leer sus propios canjes
    match /redemptions/{redemptionId} {
      allow read: if request.auth != null && 
                     request.auth.uid == resource.data.customerId;
      allow write: if false; // Solo las Cloud Functions pueden escribir
    }
  }
}
```

## Consideraciones de Implementación

### Fase 1: Implementación Básica
1. Crear la estructura de datos para múltiples programas
2. Implementar los 4 tipos básicos de programas
3. Desarrollar la interfaz de gestión para business owners
4. Crear el sistema de prioridades

### Fase 2: Funcionalidades Avanzadas
1. Restricciones temporales y de frecuencia
2. Análisis y reportes avanzados
3. Notificaciones push personalizadas
4. Integración con marketing automation

### Fase 3: Optimizaciones
1. Cache de programas activos
2. Procesamiento en batch para mejor rendimiento
3. Machine learning para recomendaciones de programas
4. API para integraciones externas

### Consideraciones de Rendimiento
- **Cache**: Mantener programas activos en cache para evitar lecturas repetidas
- **Batch Processing**: Procesar múltiples tickets en lotes durante horas de menor tráfico
- **Índices**: Crear índices apropiados para consultas de progreso y canjes
- **Lazy Loading**: Cargar detalles de programas solo cuando sea necesario

### Consideraciones de Seguridad
- **Validación de Duplicados**: Prevenir procesamiento de tickets duplicados
- **Rate Limiting**: Limitar la frecuencia de canjes por cliente
- **Audit Trail**: Mantener registro completo de todas las transacciones
- **Encriptación**: Proteger códigos de canje y datos sensibles