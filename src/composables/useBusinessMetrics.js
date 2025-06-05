import { ref, computed, watch } from 'vue'
import { businessService } from '@/services/businessService'

export function useBusinessMetrics(businessSlug, entityId = ref('all')) {
  const metrics = ref({
    totalPurchases: 0,
    totalRevenue: 0,
    uniqueCustomers: 0,
    averageTicket: 0,
    monthlyGrowth: 0,
    weeklyGrowth: 0,
    topCustomers: [],
    recentTrends: [],
    entityBreakdown: []
  })
  
  const loading = ref(false)
  const error = ref(null)
  const lastUpdated = ref(null)

  // Cache para métricas
  const metricsCache = new Map()
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  const getCacheKey = (businessSlug, entityId) => {
    return `${businessSlug}-${entityId || 'all'}`
  }

  const getCachedMetrics = (key) => {
    const cached = metricsCache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    return null
  }

  const setCachedMetrics = (key, data) => {
    metricsCache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  const fetchMetrics = async () => {
    if (!businessSlug) return

    loading.value = true
    error.value = null

    try {
      const cacheKey = getCacheKey(businessSlug, entityId.value)
      const cached = getCachedMetrics(cacheKey)
      
      if (cached) {
        metrics.value = cached
        loading.value = false
        return
      }

      console.log('🔍 Obteniendo métricas para:', { businessSlug, entityId: entityId.value })

      // Obtener compras filtradas por entidad si se especifica
      const filters = {}
      if (entityId.value && entityId.value !== 'all') {
        filters.entityId = entityId.value
      }

      const purchases = await businessService.getPurchases(businessSlug, filters)
      console.log('📊 Compras obtenidas:', purchases.length)

      const calculatedMetrics = calculateMetrics(purchases)
      
      // Si estamos viendo todas las entidades, también calcular desglose
      if (!entityId.value || entityId.value === 'all') {
        calculatedMetrics.entityBreakdown = await calculateEntityBreakdown(businessSlug)
      }

      metrics.value = calculatedMetrics
      setCachedMetrics(cacheKey, calculatedMetrics)
      lastUpdated.value = new Date()

    } catch (err) {
      console.error('❌ Error obteniendo métricas:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const calculateMetrics = (purchases) => {
    if (!purchases.length) {
      return {
        totalPurchases: 0,
        totalRevenue: 0,
        uniqueCustomers: 0,
        averageTicket: 0,
        monthlyGrowth: 0,
        weeklyGrowth: 0,
        topCustomers: [],
        recentTrends: []
      }
    }

    const totalRevenue = purchases.reduce((sum, p) => sum + (p.amount || 0), 0)
    const uniqueCustomers = new Set(purchases.map(p => p.phoneNumber)).size
    const averageTicket = totalRevenue / purchases.length

    return {
      totalPurchases: purchases.length,
      totalRevenue,
      uniqueCustomers,
      averageTicket,
      monthlyGrowth: calculateMonthlyGrowth(purchases),
      weeklyGrowth: calculateWeeklyGrowth(purchases),
      topCustomers: getTopCustomers(purchases),
      recentTrends: calculateTrends(purchases)
    }
  }

  const calculateEntityBreakdown = async (businessSlug) => {
    try {
      // Obtener todas las compras para calcular desglose por entidad
      const allPurchases = await businessService.getPurchases(businessSlug)
      
      // Agrupar por entityId
      const byEntity = {}
      allPurchases.forEach(purchase => {
        const entityId = purchase.entityId || 'unknown'
        if (!byEntity[entityId]) {
          byEntity[entityId] = []
        }
        byEntity[entityId].push(purchase)
      })

      // Calcular métricas para cada entidad
      return Object.entries(byEntity).map(([entityId, purchases]) => ({
        entityId,
        metrics: calculateMetrics(purchases)
      }))
    } catch (err) {
      console.error('Error calculando desglose por entidad:', err)
      return []
    }
  }

  const calculateMonthlyGrowth = (purchases) => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    const currentMonth = purchases.filter(p => {
      const date = p.date?.toDate ? p.date.toDate() : new Date(p.date)
      return date >= lastMonth
    })

    const previousMonth = purchases.filter(p => {
      const date = p.date?.toDate ? p.date.toDate() : new Date(p.date)
      return date >= twoMonthsAgo && date < lastMonth
    })

    if (previousMonth.length === 0) return 0

    const currentRevenue = currentMonth.reduce((sum, p) => sum + p.amount, 0)
    const previousRevenue = previousMonth.reduce((sum, p) => sum + p.amount, 0)

    return ((currentRevenue - previousRevenue) / previousRevenue) * 100
  }

  const calculateWeeklyGrowth = (purchases) => {
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const currentWeek = purchases.filter(p => {
      const date = p.date?.toDate ? p.date.toDate() : new Date(p.date)
      return date >= lastWeek
    })

    const previousWeek = purchases.filter(p => {
      const date = p.date?.toDate ? p.date.toDate() : new Date(p.date)
      return date >= twoWeeksAgo && date < lastWeek
    })

    if (previousWeek.length === 0) return 0

    const currentRevenue = currentWeek.reduce((sum, p) => sum + p.amount, 0)
    const previousRevenue = previousWeek.reduce((sum, p) => sum + p.amount, 0)

    return ((currentRevenue - previousRevenue) / previousRevenue) * 100
  }

  const getTopCustomers = (purchases) => {
    const customerStats = {}
    
    purchases.forEach(purchase => {
      const phone = purchase.phoneNumber
      if (!customerStats[phone]) {
        customerStats[phone] = {
          phoneNumber: phone,
          customerName: purchase.customerName || 'Cliente',
          totalSpent: 0,
          purchaseCount: 0,
          lastPurchase: null
        }
      }
      
      customerStats[phone].totalSpent += purchase.amount
      customerStats[phone].purchaseCount += 1
      
      const purchaseDate = purchase.date?.toDate ? purchase.date.toDate() : new Date(purchase.date)
      if (!customerStats[phone].lastPurchase || purchaseDate > customerStats[phone].lastPurchase) {
        customerStats[phone].lastPurchase = purchaseDate
      }
    })

    return Object.values(customerStats)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
  }

  const calculateTrends = (purchases) => {
    // Agrupar compras por día de los últimos 30 días
    const days = 30
    const trends = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const dayPurchases = purchases.filter(p => {
        const purchaseDate = p.date?.toDate ? p.date.toDate() : new Date(p.date)
        return purchaseDate >= dayStart && purchaseDate < dayEnd
      })

      trends.push({
        date: dayStart,
        purchases: dayPurchases.length,
        revenue: dayPurchases.reduce((sum, p) => sum + p.amount, 0)
      })
    }

    return trends
  }

  // Funciones auxiliares
  const clearCache = () => {
    metricsCache.clear()
  }

  const refresh = () => {
    const cacheKey = getCacheKey(businessSlug, entityId.value)
    metricsCache.delete(cacheKey)
    return fetchMetrics()
  }

  // Computed para facilitar el acceso
  const hasData = computed(() => metrics.value.totalPurchases > 0)
  const isFiltered = computed(() => entityId.value && entityId.value !== 'all')

  // Watch para actualizar cuando cambia el filtro de entidad
  watch(entityId, () => {
    fetchMetrics()
  }, { immediate: false })

  return {
    metrics,
    loading,
    error,
    lastUpdated,
    hasData,
    isFiltered,
    fetchMetrics,
    refresh,
    clearCache
  }
}
