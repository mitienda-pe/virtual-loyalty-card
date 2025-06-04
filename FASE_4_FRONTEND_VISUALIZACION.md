# FASE 4: Frontend - Visualización y Dashboard

## 🎯 OBJETIVO
Actualizar el dashboard, reportes y visualizaciones para mostrar información desglosada por entidades comerciales, permitiendo a los administradores analizar el rendimiento de cada razón social por separado.

## 📋 CONTEXTO
Con múltiples entidades comerciales por negocio, los administradores necesitan ver:

- Métricas consolidadas del negocio completo
- Desglose por entidad específica (razón social)
- Filtros para analizar entidades individuales
- Información de entidad en las compras mostradas al cliente

### Áreas de Impacto:
1. **Dashboard Principal** - Métricas consolidadas + filtros por entidad
2. **Lista de Compras** - Mostrar información de entidad específica
3. **Tarjetas de Fidelidad** - Información consolidada del negocio
4. **Reportes** - Desglose y análisis por entidad

## 🔧 TAREAS A REALIZAR

### 1. Actualizar BusinessDashboard.vue
**Archivo:** `src/views/admin/BusinessDashboard.vue`

#### **Métricas Consolidadas:**
```vue
<template>
  <div class="business-dashboard">
    <!-- Header con selector de entidad -->
    <div class="dashboard-header">
      <h1>Dashboard - {{ business.name }}</h1>
      
      <!-- Filtro por entidad -->
      <EntitySelector 
        :entities="business.businessEntities"
        v-model="selectedEntityId"
        @change="refreshMetrics"
      />
    </div>

    <!-- Métricas principales -->
    <div class="metrics-grid">
      <MetricCard 
        title="Compras Totales"
        :value="metrics.totalPurchases"
        :subtitle="entitySubtitle"
        icon="shopping-bag"
      />
      <MetricCard 
        title="Ingresos"
        :value="formatCurrency(metrics.totalRevenue)"
        :subtitle="entitySubtitle"
        icon="dollar-sign"
      />
      <MetricCard 
        title="Clientes Únicos"
        :value="metrics.uniqueCustomers"
        :subtitle="entitySubtitle"
        icon="users"
      />
      <MetricCard 
        title="Ticket Promedio"
        :value="formatCurrency(metrics.averageTicket)"
        :subtitle="entitySubtitle"
        icon="trending-up"
      />
    </div>

    <!-- Gráficos con filtros -->
    <div class="charts-section">
      <RevenueChart 
        :data="chartsData.revenue"
        :entity-filter="selectedEntityId"
      />
      <PurchasesChart 
        :data="chartsData.purchases"
        :entity-filter="selectedEntityId"
      />
    </div>

    <!-- Tabla de compras recientes -->
    <RecentPurchasesTable 
      :purchases="recentPurchases"
      :show-entity="true"
    />
  </div>
</template>
```

#### **Lógica de Filtrado:**
```javascript
// Composable para métricas por entidad
const { metrics, loading } = useBusinessMetrics(businessSlug, selectedEntityId)

// Función para calcular métricas
const calculateMetrics = (purchases, entityId = null) => {
  let filteredPurchases = purchases
  
  if (entityId && entityId !== 'all') {
    filteredPurchases = purchases.filter(p => p.entityId === entityId)
  }
  
  return {
    totalPurchases: filteredPurchases.length,
    totalRevenue: filteredPurchases.reduce((sum, p) => sum + p.amount, 0),
    uniqueCustomers: new Set(filteredPurchases.map(p => p.phoneNumber)).size,
    averageTicket: filteredPurchases.length > 0 ? 
      filteredPurchases.reduce((sum, p) => sum + p.amount, 0) / filteredPurchases.length : 0
  }
}
```

### 2. Crear Componente EntitySelector
**Archivo:** `src/components/business/EntitySelector.vue`

```vue
<template>
  <div class="entity-selector">
    <label>Ver métricas de:</label>
    <select v-model="selectedValue" @change="$emit('change', selectedValue)">
      <option value="all">Todas las entidades</option>
      <option 
        v-for="entity in entities" 
        :key="entity.id"
        :value="entity.id"
      >
        {{ entity.businessName }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  entities: Array,
  modelValue: String
})

const emit = defineEmits(['update:modelValue', 'change'])

const selectedValue = computed({
  get: () => props.modelValue || 'all',
  set: (value) => emit('update:modelValue', value)
})
</script>
```

### 3. Actualizar RecentPurchasesTable
**Archivo:** `src/components/business/RecentPurchasesTable.vue`

```vue
<template>
  <div class="purchases-table">
    <h3>Compras Recientes</h3>
    
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Monto</th>
          <th>Fecha</th>
          <th v-if="showEntity">Entidad</th>
          <th>RUC</th>
          <th>Comprobante</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="purchase in purchases" :key="purchase.id">
          <td>{{ purchase.customerName }}</td>
          <td>{{ formatCurrency(purchase.amount) }}</td>
          <td>{{ formatDate(purchase.date) }}</td>
          <td v-if="showEntity">
            <EntityBadge :entity="getEntityInfo(purchase.entityId)" />
          </td>
          <td>{{ purchase.ruc }}</td>
          <td>{{ purchase.invoiceNumber }}</td>
          <td>
            <StatusBadge :verified="purchase.verified" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

### 4. Crear Componente EntityBadge
**Archivo:** `src/components/business/EntityBadge.vue`

```vue
<template>
  <span class="entity-badge" :title="entity?.businessName">
    <span class="entity-name">{{ truncatedName }}</span>
    <span class="entity-ruc">{{ entity?.ruc }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  entity: Object
})

const truncatedName = computed(() => {
  if (!props.entity?.businessName) return 'N/A'
  return props.entity.businessName.length > 20 ? 
    props.entity.businessName.substring(0, 20) + '...' : 
    props.entity.businessName
})
</script>

<style scoped>
.entity-badge {
  @apply inline-flex flex-col text-xs bg-gray-100 rounded px-2 py-1;
}

.entity-name {
  @apply font-medium text-gray-900;
}

.entity-ruc {
  @apply text-gray-600;
}
</style>
```

### 5. Actualizar BusinessStats.vue
**Archivo:** `src/components/business/BusinessStats.vue`

```vue
<template>
  <div class="business-stats">
    <!-- Estadísticas consolidadas -->
    <div class="consolidated-stats">
      <h3>Resumen General</h3>
      <div class="stats-grid">
        <StatCard 
          title="Total Entidades"
          :value="business.businessEntities?.length || 1"
          icon="building"
        />
        <StatCard 
          title="Compras Consolidadas"
          :value="consolidatedStats.totalPurchases"
          icon="shopping-cart"
        />
        <StatCard 
          title="Ingresos Consolidados"
          :value="formatCurrency(consolidatedStats.totalRevenue)"
          icon="dollar-sign"
        />
      </div>
    </div>

    <!-- Desglose por entidad -->
    <div class="entity-breakdown">
      <h3>Desglose por Entidad</h3>
      <div class="entities-stats">
        <EntityStatsCard 
          v-for="entity in business.businessEntities"
          :key="entity.id"
          :entity="entity"
          :stats="getEntityStats(entity.id)"
        />
      </div>
    </div>
  </div>
</template>
```

### 6. Crear Componente EntityStatsCard
**Archivo:** `src/components/business/EntityStatsCard.vue`

```vue
<template>
  <div class="entity-stats-card">
    <div class="entity-header">
      <h4>{{ entity.businessName }}</h4>
      <span class="ruc-badge">{{ entity.ruc }}</span>
    </div>
    
    <div class="entity-address">
      <MapPin class="w-4 h-4" />
      <span>{{ entity.address }}</span>
    </div>
    
    <div class="entity-metrics">
      <div class="metric">
        <span class="metric-value">{{ stats.purchases }}</span>
        <span class="metric-label">Compras</span>
      </div>
      <div class="metric">
        <span class="metric-value">{{ formatCurrency(stats.revenue) }}</span>
        <span class="metric-label">Ingresos</span>
      </div>
      <div class="metric">
        <span class="metric-value">{{ stats.customers }}</span>
        <span class="metric-label">Clientes</span>
      </div>
    </div>
    
    <div class="entity-locations" v-if="entity.locations?.length">
      <h5>Ubicaciones:</h5>
      <div class="locations-list">
        <span 
          v-for="location in entity.locations" 
          :key="location"
          class="location-tag"
        >
          {{ location }}
        </span>
      </div>
    </div>
  </div>
</template>
```

### 7. Actualizar Tarjeta de Fidelidad
**Archivo:** `src/views/customer/LoyaltyCard.vue`

```vue
<template>
  <div class="loyalty-card">
    <!-- Header con información del negocio consolidada -->
    <div class="card-header">
      <h1>{{ business.name }}</h1>
      <p class="business-description">{{ business.description }}</p>
    </div>

    <!-- Información del cliente -->
    <div class="customer-info">
      <h2>{{ customer.name }}</h2>
      <p>{{ customer.phone }}</p>
    </div>

    <!-- Métricas consolidadas -->
    <div class="loyalty-metrics">
      <div class="metric">
        <span class="metric-value">{{ customer.totalPurchases }}</span>
        <span class="metric-label">Compras Totales</span>
      </div>
      <div class="metric">
        <span class="metric-value">{{ formatCurrency(customer.totalSpent) }}</span>
        <span class="metric-label">Total Gastado</span>
      </div>
    </div>

    <!-- Historial de compras con información de entidad -->
    <div class="purchase-history">
      <h3>Historial de Compras</h3>
      <div class="purchases-list">
        <PurchaseHistoryItem 
          v-for="purchase in customer.purchases"
          :key="purchase.id"
          :purchase="purchase"
          :show-entity-info="hasMultipleEntities"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
const hasMultipleEntities = computed(() => {
  return business.value?.businessEntities?.length > 1
})
</script>
```

### 8. Crear Componente PurchaseHistoryItem
**Archivo:** `src/components/customer/PurchaseHistoryItem.vue`

```vue
<template>
  <div class="purchase-item">
    <div class="purchase-main">
      <div class="purchase-amount">{{ formatCurrency(purchase.amount) }}</div>
      <div class="purchase-date">{{ formatDate(purchase.date) }}</div>
    </div>
    
    <div v-if="showEntityInfo && purchase.entityId" class="purchase-entity">
      <div class="entity-name">{{ getEntityName(purchase.entityId) }}</div>
      <div class="entity-address">{{ getEntityAddress(purchase.entityId) }}</div>
    </div>
    
    <div class="purchase-details">
      <span class="invoice-number" v-if="purchase.invoiceNumber">
        {{ purchase.invoiceNumber }}
      </span>
      <span class="verified-badge" v-if="purchase.verified">
        Verificado
      </span>
    </div>
  </div>
</template>
```

### 9. Servicios y Composables

#### **useBusinessMetrics.js**
```javascript
export function useBusinessMetrics(businessSlug, entityId = null) {
  const metrics = ref({})
  const loading = ref(false)
  const error = ref(null)

  const fetchMetrics = async () => {
    loading.value = true
    try {
      // Obtener compras filtradas por entidad si se especifica
      const purchases = await businessService.getPurchases(businessSlug, {
        entityId: entityId === 'all' ? null : entityId
      })
      
      metrics.value = calculateMetrics(purchases)
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const calculateMetrics = (purchases) => {
    return {
      totalPurchases: purchases.length,
      totalRevenue: purchases.reduce((sum, p) => sum + p.amount, 0),
      uniqueCustomers: new Set(purchases.map(p => p.phoneNumber)).size,
      averageTicket: purchases.length > 0 ? 
        purchases.reduce((sum, p) => sum + p.amount, 0) / purchases.length : 0,
      // Métricas adicionales
      monthlyGrowth: calculateMonthlyGrowth(purchases),
      topCustomers: getTopCustomers(purchases),
      recentTrends: calculateTrends(purchases)
    }
  }

  return {
    metrics,
    loading,
    error,
    fetchMetrics,
    refresh: fetchMetrics
  }
}
```

#### **businessService.js (actualización)**
```javascript
// Agregar filtros por entidad
export const businessService = {
  // ... métodos existentes

  async getPurchases(businessSlug, filters = {}) {
    const { entityId, startDate, endDate, limit } = filters
    
    let query = db.collection('business_invoices')
      .doc(businessSlug)
      .collection('purchases')
      .orderBy('date', 'desc')
    
    if (entityId) {
      query = query.where('entityId', '==', entityId)
    }
    
    if (startDate) {
      query = query.where('date', '>=', startDate)
    }
    
    if (endDate) {
      query = query.where('date', '<=', endDate)
    }
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const snapshot = await query.get()
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  async getEntityMetrics(businessSlug, entityId) {
    const purchases = await this.getPurchases(businessSlug, { entityId })
    
    return {
      totalPurchases: purchases.length,
      totalRevenue: purchases.reduce((sum, p) => sum + p.amount, 0),
      uniqueCustomers: new Set(purchases.map(p => p.phoneNumber)).size,
      averageTicket: purchases.length > 0 ? 
        purchases.reduce((sum, p) => sum + p.amount, 0) / purchases.length : 0
    }
  }
}
```

### 10. Actualizar Gráficos y Reportes

#### **RevenueChart.vue**
```vue
<template>
  <div class="revenue-chart">
    <div class="chart-header">
      <h3>Ingresos por Período</h3>
      <EntityFilter 
        v-if="showEntityFilter"
        :entities="entities"
        v-model="selectedEntity"
      />
    </div>
    
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup>
// Lógica para filtrar datos por entidad
const filteredData = computed(() => {
  if (!props.entityFilter || props.entityFilter === 'all') {
    return props.data
  }
  
  return props.data.filter(item => item.entityId === props.entityFilter)
})

// Actualizar gráfico cuando cambia el filtro
watch(filteredData, updateChart)
</script>
```

## 📝 CRITERIOS DE ACEPTACIÓN

✅ **Dashboard Actualizado:**
- Métricas se pueden filtrar por entidad específica o ver consolidadas
- Gráficos reflejan filtros aplicados
- Tabla de compras muestra información de entidad

✅ **Información de Entidad Visible:**
- Compras muestran razón social y RUC específicos
- Tarjetas de fidelidad incluyen desglose cuando hay múltiples entidades
- Direcciones específicas de cada entidad se muestran correctamente

✅ **Filtros Funcionales:**
- Selector de entidad funciona en tiempo real
- Métricas se recalculan correctamente al cambiar filtros
- Estado "Todas las entidades" muestra datos consolidados

✅ **Experiencia de Usuario:**
- Información se presenta de forma clara y organizada
- No hay confusión entre datos de diferentes entidades
- Performance optimizada para negocios con múltiples entidades

## 🧪 CASOS DE PRUEBA

### Caso 1: Negocio con Una Entidad
- Dashboard muestra métricas normalmente
- No se muestran filtros de entidad innecesarios
- Información se presenta sin etiquetas de entidad

### Caso 2: Negocio con Múltiples Entidades - Vista Consolidada
- Selector muestra "Todas las entidades" por defecto
- Métricas suman datos de todas las entidades
- Compras muestran etiquetas de entidad correspondiente

### Caso 3: Filtro por Entidad Específica
- Métricas se filtran correctamente por entidad seleccionada
- Gráficos reflejan solo datos de la entidad filtrada
- Tabla de compras muestra solo compras de esa entidad

### Caso 4: Tarjeta de Fidelidad del Cliente
- Cliente ve todas sus compras consolidadas del negocio
- Compras de diferentes entidades se distinguen visualmente
- Total de compras y gastos incluye todas las entidades

### Caso 5: Información Detallada de Compra
- Cada compra muestra la razón social específica que la emitió
- RUC y dirección corresponden a la entidad correcta
- No hay confusión entre datos de diferentes entidades

## 📁 ARCHIVOS A CREAR/MODIFICAR

### Nuevos Archivos:
1. `src/components/business/EntitySelector.vue`
2. `src/components/business/EntityBadge.vue`
3. `src/components/business/EntityStatsCard.vue`
4. `src/components/customer/PurchaseHistoryItem.vue`
5. `src/composables/useBusinessMetrics.js`
6. `src/composables/useEntityAnalytics.js`

### Archivos a Modificar:
1. `src/views/admin/BusinessDashboard.vue`
2. `src/components/business/RecentPurchasesTable.vue`
3. `src/components/business/BusinessStats.vue`
4. `src/views/customer/LoyaltyCard.vue`
5. `src/components/charts/RevenueChart.vue`
6. `src/components/charts/PurchasesChart.vue`
7. `src/services/businessService.js`

## 🔄 DEPENDENCIAS
- **Requiere:** FASE 1, FASE 2 y FASE 3 completadas
- **Es la fase final** del proyecto de múltiples entidades

## ⚠️ CONSIDERACIONES ESPECIALES

### Performance con Múltiples Entidades
```javascript
// Optimizar consultas agrupando por entidad
const getBusinessMetrics = async (businessSlug) => {
  // Una sola consulta para todas las compras
  const allPurchases = await getPurchases(businessSlug)
  
  // Agrupar en memoria por entidad
  const byEntity = groupBy(allPurchases, 'entityId')
  
  // Calcular métricas para cada entidad
  const entityMetrics = Object.keys(byEntity).map(entityId => ({
    entityId,
    metrics: calculateMetrics(byEntity[entityId])
  }))
  
  return {
    consolidated: calculateMetrics(allPurchases),
    byEntity: entityMetrics
  }
}
```

### Caching de Métricas
```javascript
// Cache para evitar recálculos innecesarios
const metricsCache = new Map()

const getCachedMetrics = (businessSlug, entityId) => {
  const key = `${businessSlug}-${entityId || 'all'}`
  
  if (metricsCache.has(key)) {
    const cached = metricsCache.get(key)
    // Cache válido por 5 minutos
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.data
    }
  }
  
  return null
}
```

### Mensaje WhatsApp Actualizado
Con la información de entidad específica, el mensaje debe mostrar:
```
¡Gracias por tu compra en McDonald's!

🧯 Comprobante registrado correctamente
💰 Monto: S/ 25.50
🏢 Razón Social: McDonald's Peru S.A.C.
📍 Dirección: Av. Javier Prado 123
📄 RUC: 20123456789

🛍️ Compra registrada exitosamente
🛒 Total de compras en McDonald's: 8

Ver tu tarjeta de fidelidad: https://asiduo.club/mcdonalds/+51987654321
```

## 📋 CHECKLIST FINAL
- [ ] Dashboard con filtros por entidad implementado
- [ ] Componente EntitySelector creado y funcional
- [ ] Tabla de compras muestra información de entidad
- [ ] Componente EntityBadge para identificación visual
- [ ] BusinessStats actualizado con desglose por entidad
- [ ] EntityStatsCard para métricas individuales
- [ ] Tarjeta de fidelidad actualizada con información consolidada
- [ ] PurchaseHistoryItem muestra detalles de entidad
- [ ] Composable useBusinessMetrics con filtros
- [ ] Servicios actualizados para consultas por entidad
- [ ] Gráficos y reportes con filtros funcionales
- [ ] Performance optimizada para múltiples entidades
- [ ] Tests de interfaz de usuario completos
- [ ] Documentación de componentes actualizada

## 🎉 RESULTADO FINAL
Al completar esta fase, el sistema será capaz de:
- Gestionar múltiples razones sociales por negocio
- Mostrar información específica por entidad en todos los reportes
- Mantener tarjetas de fidelidad consolidadas por nombre comercial
- Proporcionar análisis detallado por entidad comercial
- Mantener compatibilidad total con negocios existentes
