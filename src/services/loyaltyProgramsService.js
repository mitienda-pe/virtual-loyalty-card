import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db } from '@/firebase'

export const loyaltyProgramsService = {
  
  /**
   * Obtiene todos los programas de lealtad de un negocio
   */
  async getBusinessPrograms(businessSlug) {
    try {
      const programsRef = collection(db, 'businesses', businessSlug, 'loyaltyPrograms')
      const q = query(programsRef, orderBy('priority', 'asc'))
      const snapshot = await getDocs(q)
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error getting business programs:', error)
      throw error
    }
  },

  /**
   * Obtiene programas activos de un negocio ordenados por prioridad
   */
  async getActivePrograms(businessSlug) {
    try {
      const programsRef = collection(db, 'businesses', businessSlug, 'loyaltyPrograms')
      const q = query(
        programsRef, 
        where('status', '==', 'active'),
        orderBy('priority', 'asc')
      )
      const snapshot = await getDocs(q)
      
      const programs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Filtrar por fechas de validez
      const now = new Date()
      return programs.filter(program => {
        const startDate = program.startDate ? new Date(program.startDate) : null
        const endDate = program.endDate ? new Date(program.endDate) : null
        
        if (startDate && now < startDate) return false
        if (endDate && now > endDate) return false
        
        return true
      })
    } catch (error) {
      console.error('Error getting active programs:', error)
      throw error
    }
  },

  /**
   * Crea un nuevo programa de lealtad
   */
  async createProgram(businessSlug, programData) {
    try {
      // Validar datos del programa
      const validation = this.validateProgramData(programData)
      if (!validation.isValid) {
        throw new Error(`Datos del programa inválidos: ${validation.errors.join(', ')}`)
      }

      // Generar ID único
      const programRef = doc(collection(db, 'businesses', businessSlug, 'loyaltyPrograms'))
      
      // Obtener siguiente prioridad disponible
      const programs = await this.getBusinessPrograms(businessSlug)
      const nextPriority = programs.length > 0 ? Math.max(...programs.map(p => p.priority || 0)) + 1 : 1

      const program = {
        ...programData,
        businessSlug,
        priority: programData.priority || nextPriority,
        status: programData.status || 'active',
        stats: {
          totalParticipants: 0,
          rewardsRedeemed: 0,
          totalRevenue: 0,
          averageTicketValue: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await setDoc(programRef, program)
      
      return {
        id: programRef.id,
        ...program
      }
    } catch (error) {
      console.error('Error creating program:', error)
      throw error
    }
  },

  /**
   * Actualiza un programa de lealtad
   */
  async updateProgram(businessSlug, programId, programData) {
    try {
      // Validar datos del programa
      const validation = this.validateProgramData(programData)
      if (!validation.isValid) {
        throw new Error(`Datos del programa inválidos: ${validation.errors.join(', ')}`)
      }

      const programRef = doc(db, 'businesses', businessSlug, 'loyaltyPrograms', programId)
      
      const updateData = {
        ...programData,
        updatedAt: serverTimestamp()
      }

      await updateDoc(programRef, updateData)
      
      return await this.getProgram(businessSlug, programId)
    } catch (error) {
      console.error('Error updating program:', error)
      throw error
    }
  },

  /**
   * Elimina un programa de lealtad
   */
  async deleteProgram(businessSlug, programId) {
    try {
      const programRef = doc(db, 'businesses', businessSlug, 'loyaltyPrograms', programId)
      await deleteDoc(programRef)
      return { success: true }
    } catch (error) {
      console.error('Error deleting program:', error)
      throw error
    }
  },

  /**
   * Obtiene un programa específico
   */
  async getProgram(businessSlug, programId) {
    try {
      const programRef = doc(db, 'businesses', businessSlug, 'loyaltyPrograms', programId)
      const docSnap = await getDoc(programRef)
      
      if (!docSnap.exists()) {
        return null
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      }
    } catch (error) {
      console.error('Error getting program:', error)
      throw error
    }
  },

  /**
   * Actualiza las prioridades de múltiples programas
   */
  async updateProgramPriorities(businessSlug, priorityUpdates) {
    try {
      const batch = []
      
      for (const update of priorityUpdates) {
        const programRef = doc(db, 'businesses', businessSlug, 'loyaltyPrograms', update.id)
        batch.push(updateDoc(programRef, { 
          priority: update.priority,
          updatedAt: serverTimestamp()
        }))
      }
      
      await Promise.all(batch)
      return { success: true }
    } catch (error) {
      console.error('Error updating program priorities:', error)
      throw error
    }
  },

  /**
   * Cambia el estado de un programa (activo/pausado)
   */
  async toggleProgramStatus(businessSlug, programId) {
    try {
      const program = await this.getProgram(businessSlug, programId)
      if (!program) {
        throw new Error('Programa no encontrado')
      }

      const newStatus = program.status === 'active' ? 'paused' : 'active'
      
      await this.updateProgram(businessSlug, programId, {
        ...program,
        status: newStatus
      })

      return { success: true, newStatus }
    } catch (error) {
      console.error('Error toggling program status:', error)
      throw error
    }
  },

  /**
   * Obtiene estadísticas de programas
   */
  async getProgramsStats(businessSlug) {
    try {
      const programs = await this.getBusinessPrograms(businessSlug)
      
      return {
        totalPrograms: programs.length,
        activePrograms: programs.filter(p => p.status === 'active').length,
        totalParticipants: programs.reduce((sum, p) => sum + (p.stats?.totalParticipants || 0), 0),
        totalRedemptions: programs.reduce((sum, p) => sum + (p.stats?.rewardsRedeemed || 0), 0),
        totalRevenue: programs.reduce((sum, p) => sum + (p.stats?.totalRevenue || 0), 0)
      }
    } catch (error) {
      console.error('Error getting programs stats:', error)
      throw error
    }
  },

  /**
   * Valida los datos de un programa
   */
  validateProgramData(programData) {
    const errors = []

    // Validaciones básicas
    if (!programData.name?.trim()) {
      errors.push('El nombre del programa es requerido')
    }

    if (!programData.type) {
      errors.push('El tipo de programa es requerido')
    }

    if (!['visits', 'specific_product', 'ticket_value', 'points'].includes(programData.type)) {
      errors.push('Tipo de programa no válido')
    }

    // Validaciones específicas por tipo
    if (programData.type === 'visits') {
      if (!programData.config?.target || programData.config.target < 1) {
        errors.push('El número de visitas debe ser al menos 1')
      }
      if (!programData.config?.reward?.trim()) {
        errors.push('La recompensa es requerida')
      }
    }

    if (programData.type === 'specific_product') {
      if (!programData.config?.target || programData.config.target < 1) {
        errors.push('El número de productos debe ser al menos 1')
      }
      if (!programData.config?.productKeywords || programData.config.productKeywords.length === 0) {
        errors.push('Las palabras clave del producto son requeridas')
      }
      if (!programData.config?.reward?.trim()) {
        errors.push('La recompensa es requerida')
      }
    }

    if (programData.type === 'ticket_value') {
      if (!programData.config?.target || programData.config.target < 1) {
        errors.push('El número de tickets debe ser al menos 1')
      }
      if (!programData.config?.minTicketValue || programData.config.minTicketValue <= 0) {
        errors.push('El valor mínimo del ticket debe ser mayor a 0')
      }
      if (!programData.config?.reward?.trim()) {
        errors.push('La recompensa es requerida')
      }
    }

    if (programData.type === 'points') {
      if (!programData.config?.pointsPerDollar || programData.config.pointsPerDollar <= 0) {
        errors.push('Los puntos por dólar deben ser mayor a 0')
      }
      if (!programData.config?.rewards || programData.config.rewards.length === 0) {
        errors.push('Debe definir al menos un nivel de recompensa')
      }
      
      // Validar niveles de recompensa
      if (programData.config?.rewards) {
        programData.config.rewards.forEach((reward, index) => {
          if (!reward.points || reward.points <= 0) {
            errors.push(`Los puntos del nivel ${index + 1} deben ser mayor a 0`)
          }
          if (!reward.reward?.trim()) {
            errors.push(`La recompensa del nivel ${index + 1} es requerida`)
          }
        })
      }
    }

    // Validar fechas
    if (programData.startDate && programData.endDate) {
      const startDate = new Date(programData.startDate)
      const endDate = new Date(programData.endDate)
      
      if (endDate <= startDate) {
        errors.push('La fecha de fin debe ser posterior a la fecha de inicio')
      }
    }

    // Validar prioridad
    if (programData.priority && programData.priority < 1) {
      errors.push('La prioridad debe ser al menos 1')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Obtiene estadísticas detalladas de un programa
   */
  async getProgramDetailedStats(businessSlug, programId, timeframe = '30d') {
    try {
      // TODO: Implementar estadísticas detalladas
      // Por ahora retornamos estadísticas básicas
      const program = await this.getProgram(businessSlug, programId)
      
      if (!program) {
        throw new Error('Programa no encontrado')
      }

      return {
        program,
        participants: program.stats?.totalParticipants || 0,
        redemptions: program.stats?.rewardsRedeemed || 0,
        revenue: program.stats?.totalRevenue || 0,
        conversionRate: program.stats?.totalParticipants > 0 ? 
          (program.stats.rewardsRedeemed / program.stats.totalParticipants * 100).toFixed(2) : 0,
        averageTicket: program.stats?.averageTicketValue || 0,
        trends: [] // TODO: Implementar tendencias
      }
    } catch (error) {
      console.error('Error getting program detailed stats:', error)
      throw error
    }
  }
}

export default loyaltyProgramsService