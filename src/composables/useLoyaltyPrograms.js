import { ref, computed } from 'vue'
import loyaltyProgramsService from '@/services/loyaltyProgramsService'

export function useLoyaltyPrograms(businessSlug) {
  const programs = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Estados para estadísticas
  const stats = ref({
    totalPrograms: 0,
    activePrograms: 0,
    totalParticipants: 0,
    totalRedemptions: 0,
    totalRevenue: 0
  })

  // Computed properties
  const activePrograms = computed(() => 
    programs.value.filter(p => p.status === 'active')
  )

  const sortedPrograms = computed(() => 
    [...programs.value].sort((a, b) => (a.priority || 999) - (b.priority || 999))
  )

  // Métodos principales
  const fetchPrograms = async () => {
    if (!businessSlug) return

    loading.value = true
    error.value = null

    try {
      programs.value = await loyaltyProgramsService.getBusinessPrograms(businessSlug)
    } catch (err) {
      console.error('Error fetching programs:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const fetchActivePrograms = async () => {
    if (!businessSlug) return

    loading.value = true
    error.value = null

    try {
      const activeProgs = await loyaltyProgramsService.getActivePrograms(businessSlug)
      // Actualizar solo los programas activos en la lista principal
      programs.value = programs.value.map(p => {
        const active = activeProgs.find(ap => ap.id === p.id)
        return active ? active : p
      })
    } catch (err) {
      console.error('Error fetching active programs:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const createProgram = async (programData) => {
    loading.value = true
    error.value = null

    try {
      const newProgram = await loyaltyProgramsService.createProgram(businessSlug, programData)
      programs.value.push(newProgram)
      return newProgram
    } catch (err) {
      console.error('Error creating program:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateProgram = async (programId, programData) => {
    loading.value = true
    error.value = null

    try {
      const updatedProgram = await loyaltyProgramsService.updateProgram(businessSlug, programId, programData)
      const index = programs.value.findIndex(p => p.id === programId)
      if (index !== -1) {
        programs.value[index] = updatedProgram
      }
      return updatedProgram
    } catch (err) {
      console.error('Error updating program:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteProgram = async (programId) => {
    loading.value = true
    error.value = null

    try {
      await loyaltyProgramsService.deleteProgram(businessSlug, programId)
      programs.value = programs.value.filter(p => p.id !== programId)
      return { success: true }
    } catch (err) {
      console.error('Error deleting program:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateProgramPriorities = async (priorityUpdates) => {
    loading.value = true
    error.value = null

    try {
      await loyaltyProgramsService.updateProgramPriorities(businessSlug, priorityUpdates)
      
      // Actualizar prioridades localmente
      priorityUpdates.forEach(update => {
        const program = programs.value.find(p => p.id === update.id)
        if (program) {
          program.priority = update.priority
        }
      })
      
      return { success: true }
    } catch (err) {
      console.error('Error updating priorities:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const toggleProgramStatus = async (programId) => {
    loading.value = true
    error.value = null

    try {
      const result = await loyaltyProgramsService.toggleProgramStatus(businessSlug, programId)
      
      // Actualizar estado localmente
      const program = programs.value.find(p => p.id === programId)
      if (program) {
        program.status = result.newStatus
      }
      
      return result
    } catch (err) {
      console.error('Error toggling program status:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchProgramsStats = async () => {
    if (!businessSlug) return

    try {
      stats.value = await loyaltyProgramsService.getProgramsStats(businessSlug)
    } catch (err) {
      console.error('Error fetching programs stats:', err)
      error.value = err.message
    }
  }

  const getProgramDetailedStats = async (programId, timeframe = '30d') => {
    try {
      return await loyaltyProgramsService.getProgramDetailedStats(businessSlug, programId, timeframe)
    } catch (err) {
      console.error('Error fetching program detailed stats:', err)
      error.value = err.message
      throw err
    }
  }

  // Métodos de utilidad
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
    if (!program || !program.config) return 'N/A'

    switch (program.type) {
      case 'visits':
        return `${program.config.target} visitas`
      case 'specific_product':
        return `${program.config.target} productos específicos`
      case 'ticket_value':
        return `${program.config.target} compras de S/${program.config.minTicketValue}+`
      case 'points':
        return `Sistema de puntos (${program.config.pointsPerDollar} pts/S/)`
      default:
        return 'N/A'
    }
  }

  const formatDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return 'Sin restricción'
    
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
    
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`
    } else if (startDate) {
      return `Desde ${formatDate(startDate)}`
    } else if (endDate) {
      return `Hasta ${formatDate(endDate)}`
    }
    
    return 'Sin restricción'
  }

  const validateProgramData = (programData) => {
    return loyaltyProgramsService.validateProgramData(programData)
  }

  // Funciones de inicialización
  const initialize = async () => {
    await Promise.all([
      fetchPrograms(),
      fetchProgramsStats()
    ])
  }

  const refresh = async () => {
    await initialize()
  }

  return {
    // Estado
    programs,
    loading,
    error,
    stats,
    
    // Computed
    activePrograms,
    sortedPrograms,
    
    // Métodos
    fetchPrograms,
    fetchActivePrograms,
    createProgram,
    updateProgram,
    deleteProgram,
    updateProgramPriorities,
    toggleProgramStatus,
    fetchProgramsStats,
    getProgramDetailedStats,
    
    // Utilidades
    getProgramTypeLabel,
    getProgramTargetText,
    formatDateRange,
    validateProgramData,
    
    // Inicialización
    initialize,
    refresh
  }
}

export default useLoyaltyPrograms