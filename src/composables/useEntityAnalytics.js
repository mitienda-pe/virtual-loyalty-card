import { ref, computed } from 'vue'
import { businessService } from '@/services/businessService'

export function useEntityAnalytics(businessSlug) {
  const loading = ref(false)
  const error = ref(null)
  const analyticsData = ref({
    consolidatedMetrics: {},
    entityMetrics: [],
    comparisonData: [],
    trendsData: []
  })

  // Obtener analíticas consolidadas
  const fetchConsolidatedAnalytics = async () => {
    loading.value = true
    error.value = null

    try {
      console.log('🔍 Obteniendo analíticas consolidadas para:', businessSlug)

      // Obtener métricas consolidadas
      const consolidated = await businessService.getConsolidatedMetrics(businessSlug)
      
      // Obtener business data para obtener entidades
      const business = await businessService.getBusinessById(businessSlug)
      
      // Obtener métricas por cada entidad
      const entityMetrics = []
      if (business?.businessEntities?.length > 0) {
        for (const entity of business.businessEntities) {
          try {
            const metrics = await businessService.getEntityMetrics(businessSlug, entity.id)
            entityMetrics.push({
              entityId: entity.id,
              entityName: entity.businessName,
              entityRuc: entity.ruc,
              entityAddress: entity.address,
              ...metrics
            })
          } catch (entityError) {
            console.warn(`Error obteniendo métricas para entidad ${entity.id}:`, entityError)
          }
        }
      }

      analyticsData.value = {
        consolidatedMetrics: consolidated,
        entityMetrics,
        comparisonData: calculateComparisonData(entityMetrics),
        trendsData: await calculateTrendsData(businessSlug, business.businessEntities)
      }

    } catch (err) {
      console.error('❌ Error obteniendo analíticas:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Obtener analíticas para una entidad específica
  const fetchEntityAnalytics = async (entityId) => {
    loading.value = true
    error.value = null

    try {
      console.log('🔍 Obteniendo analíticas para entidad:', entityId)

      const business = await businessService.getBusinessById(businessSlug)
      const entity = business?.businessEntities?.find(e => e.id === entityId)
      
      if (!entity) {
        throw new Error('Entidad no encontrada')
      }

      const metrics = await businessService.getEntityMetrics(businessSlug, entityId)
      const purchases = await businessService.getPurchases(businessSlug, { entityId })

      analyticsData.value = {
        consolidatedMetrics: metrics,
        entityMetrics: [{
          entityId,
          entityName: entity.businessName,
          entityRuc: entity.ruc,
          entityAddress: entity.address,
          ...metrics
        }],
        comparisonData: [],
        trendsData: calculateEntityTrends(purchases),
        detailedPurchases: purchases
      }

    } catch (err) {
      console.error('❌ Error obteniendo analíticas de entidad:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Calcular datos de comparación entre entidades
  const calculateComparisonData = (entityMetrics) => {
    if (!entityMetrics || entityMetrics.length <= 1) return []

    const totalRevenue = entityMetrics.reduce((sum, entity) => sum + (entity.totalRevenue || 0), 0)
    const totalPurchases = entityMetrics.reduce((sum, entity) => sum + (entity.totalPurchases || 0), 0)

    return entityMetrics.map(entity => ({
      entityId: entity.entityId,
      entityName: entity.entityName,
      entityRuc: entity.entityRuc,
      revenuePercentage: totalRevenue > 0 ? ((entity.totalRevenue || 0) / totalRevenue) * 100 : 0,
      purchasesPercentage: totalPurchases > 0 ? ((entity.totalPurchases || 0) / totalPurchases) * 100 : 0,
      averageTicket: entity.averageTicket || 0,
      ranking: 0 // Se calculará después del sort
    })).sort((a, b) => b.revenuePercentage - a.revenuePercentage)
      .map((entity, index) => ({ ...entity, ranking: index + 1 }))
  }

  // Calcular datos de tendencias
  const calculateTrendsData = async (businessSlug, entities) => {
    try {
      const trends = []
      const last30Days = new Date()
      last30Days.setDate(last30Days.getDate() - 30)

      // Obtener datos de los últimos 30 días para cada entidad
      for (const entity of entities || []) {
        try {
          const purchases = await businessService.getPurchases(businessSlug, {
            entityId: entity.id,
            startDate: last30Days
          })

          const dailyData = calculateDailyTrends(purchases)
          trends.push({
            entityId: entity.id,
            entityName: entity.businessName,
            dailyData
          })
        } catch (entityError) {
          console.warn(`Error calculando tendencias para ${entity.id}:`, entityError)
        }
      }

      return trends
    } catch (error) {
      console.error('Error calculando tendencias:', error)
      return []
    }
  }

  // Calcular tendencias diarias
  const calculateDailyTrends = (purchases) => {
    const dailyStats = {}
    
    purchases.forEach(purchase => {
      const date = purchase.date?.toDate ? purchase.date.toDate() : new Date(purchase.date)
      const dayKey = date.toISOString().split('T')[0]
      
      if (!dailyStats[dayKey]) {
        dailyStats[dayKey] = {
          date: dayKey,
          purchases: 0,
          revenue: 0,
          customers: new Set()
        }
      }
      
      dailyStats[dayKey].purchases++
      dailyStats[dayKey].revenue += purchase.amount || 0
      dailyStats[dayKey].customers.add(purchase.phoneNumber)
    })

    // Convertir sets a counts y ordenar por fecha
    return Object.values(dailyStats)
      .map(day => ({
        ...day,
        customers: day.customers.size
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  // Calcular tendencias para una entidad específica
  const calculateEntityTrends = (purchases) => {
    return calculateDailyTrends(purchases)
  }

  // Exportar datos a CSV
  const exportToCSV = (data, filename) => {
    const csvContent = convertToCSV(data)
    downloadCSV(csvContent, filename)
  }

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          return typeof value === 'string' ? `"${value}"` : value
        }).join(',')
      )
    ]

    return csvRows.join('\n')
  }

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Computados para facilitar el acceso a datos
  const consolidatedMetrics = computed(() => analyticsData.value.consolidatedMetrics)
  const entityMetrics = computed(() => analyticsData.value.entityMetrics)
  const comparisonData = computed(() => analyticsData.value.comparisonData)
  const trendsData = computed(() => analyticsData.value.trendsData)
  
  // Computado para obtener el top performer
  const topPerformingEntity = computed(() => {
    if (entityMetrics.value.length === 0) return null
    return entityMetrics.value.reduce((top, current) => 
      (current.totalRevenue || 0) > (top.totalRevenue || 0) ? current : top
    )
  })

  // Computado para obtener estadísticas de crecimiento
  const growthStats = computed(() => {
    if (!trendsData.value || trendsData.value.length === 0) return null

    return trendsData.value.map(entityTrend => {
      const data = entityTrend.dailyData
      if (data.length < 2) return { entityId: entityTrend.entityId, growth: 0 }

      const recent = data.slice(-7) // Últimos 7 días
      const previous = data.slice(-14, -7) // 7 días anteriores

      const recentAvg = recent.reduce((sum, day) => sum + day.revenue, 0) / recent.length
      const previousAvg = previous.reduce((sum, day) => sum + day.revenue, 0) / previous.length

      const growth = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0

      return {
        entityId: entityTrend.entityId,
        entityName: entityTrend.entityName,
        growth: Math.round(growth * 100) / 100
      }
    })
  })

  return {
    // Estados
    loading,
    error,
    analyticsData,

    // Computados
    consolidatedMetrics,
    entityMetrics,
    comparisonData,
    trendsData,
    topPerformingEntity,
    growthStats,

    // Métodos
    fetchConsolidatedAnalytics,
    fetchEntityAnalytics,
    exportToCSV,

    // Métodos de utilidad
    refresh: fetchConsolidatedAnalytics
  }
}
