import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  updateDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore'
import { db } from '@/firebase'

export const customerLoyaltyService = {
  
  /**
   * Obtiene el progreso de un cliente en todos los programas de un negocio
   */
  async getCustomerProgress(customerId, businessSlug) {
    try {
      const progressRef = doc(db, 'customers', customerId, 'loyaltyProgress', businessSlug)
      const docSnap = await getDoc(progressRef)
      
      if (!docSnap.exists()) {
        // Inicializar progreso si no existe
        const initialProgress = {
          customerId,
          businessSlug,
          programs: {},
          totalLifetimeValue: 0,
          lastVisit: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        await setDoc(progressRef, initialProgress)
        return initialProgress
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      }
    } catch (error) {
      console.error('Error getting customer progress:', error)
      throw error
    }
  },

  /**
   * Obtiene el progreso de un cliente en un programa específico
   */
  async getCustomerProgramProgress(customerId, businessSlug, programId) {
    try {
      const progress = await this.getCustomerProgress(customerId, businessSlug)
      return progress.programs?.[programId] || null
    } catch (error) {
      console.error('Error getting customer program progress:', error)
      throw error
    }
  },

  /**
   * Actualiza el progreso de un cliente en un programa específico
   */
  async updateProgramProgress(customerId, businessSlug, programId, progressData) {
    try {
      const progressRef = doc(db, 'customers', customerId, 'loyaltyProgress', businessSlug)
      
      const updateData = {
        [`programs.${programId}`]: progressData,
        lastVisit: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await updateDoc(progressRef, updateData)
      return { success: true }
    } catch (error) {
      console.error('Error updating program progress:', error)
      throw error
    }
  },

  /**
   * Incrementa el progreso de un cliente en un programa
   */
  async incrementProgramProgress(customerId, businessSlug, programId, programType, incrementData) {
    try {
      const currentProgress = await this.getCustomerProgramProgress(customerId, businessSlug, programId)
      
      let newProgress
      
      if (!currentProgress) {
        // Crear nuevo progreso
        newProgress = this.createInitialProgress(programType, incrementData)
      } else {
        // Actualizar progreso existente
        newProgress = this.updateExistingProgress(currentProgress, programType, incrementData)
      }

      await this.updateProgramProgress(customerId, businessSlug, programId, newProgress)
      return newProgress
    } catch (error) {
      console.error('Error incrementing program progress:', error)
      throw error
    }
  },

  /**
   * Crea progreso inicial para un programa
   */
  createInitialProgress(programType, incrementData) {
    const baseProgress = {
      type: programType,
      lastUpdate: serverTimestamp(),
      history: [],
      redemptions: []
    }

    switch (programType) {
      case 'visits':
        return {
          ...baseProgress,
          currentCount: 1,
          target: incrementData.target,
          progress: 1 / incrementData.target,
          canRedeem: 1 >= incrementData.target,
          history: [{
            date: serverTimestamp(),
            ticketId: incrementData.ticketId,
            increment: 1,
            entityId: incrementData.entityId
          }]
        }

      case 'specific_product':
        return {
          ...baseProgress,
          currentCount: incrementData.productFound ? 1 : 0,
          target: incrementData.target,
          progress: incrementData.productFound ? 1 / incrementData.target : 0,
          canRedeem: incrementData.productFound && 1 >= incrementData.target,
          history: incrementData.productFound ? [{
            date: serverTimestamp(),
            ticketId: incrementData.ticketId,
            increment: 1,
            entityId: incrementData.entityId,
            productDetails: incrementData.productDetails
          }] : []
        }

      case 'ticket_value':
        return {
          ...baseProgress,
          currentCount: incrementData.meetsMinimum ? 1 : 0,
          target: incrementData.target,
          progress: incrementData.meetsMinimum ? 1 / incrementData.target : 0,
          canRedeem: incrementData.meetsMinimum && 1 >= incrementData.target,
          history: incrementData.meetsMinimum ? [{
            date: serverTimestamp(),
            ticketId: incrementData.ticketId,
            increment: 1,
            ticketValue: incrementData.ticketValue,
            entityId: incrementData.entityId
          }] : []
        }

      case 'points':
        return {
          ...baseProgress,
          currentPoints: incrementData.pointsEarned,
          totalPointsEarned: incrementData.pointsEarned,
          availableRewards: incrementData.availableRewards,
          history: [{
            date: serverTimestamp(),
            ticketId: incrementData.ticketId,
            pointsEarned: incrementData.pointsEarned,
            ticketValue: incrementData.ticketValue,
            entityId: incrementData.entityId
          }]
        }

      default:
        throw new Error(`Tipo de programa no soportado: ${programType}`)
    }
  },

  /**
   * Actualiza progreso existente
   */
  updateExistingProgress(currentProgress, programType, incrementData) {
    const newHistory = {
      date: serverTimestamp(),
      ticketId: incrementData.ticketId,
      entityId: incrementData.entityId
    }

    switch (programType) {
      case 'visits':
        const newCount = currentProgress.currentCount + 1
        return {
          ...currentProgress,
          currentCount: newCount,
          progress: newCount / currentProgress.target,
          canRedeem: newCount >= currentProgress.target,
          lastUpdate: serverTimestamp(),
          history: [...(currentProgress.history || []), {
            ...newHistory,
            increment: 1
          }]
        }

      case 'specific_product':
        if (!incrementData.productFound) {
          return currentProgress // No cambios si no se encontró el producto
        }
        const newProductCount = currentProgress.currentCount + 1
        return {
          ...currentProgress,
          currentCount: newProductCount,
          progress: newProductCount / currentProgress.target,
          canRedeem: newProductCount >= currentProgress.target,
          lastUpdate: serverTimestamp(),
          history: [...(currentProgress.history || []), {
            ...newHistory,
            increment: 1,
            productDetails: incrementData.productDetails
          }]
        }

      case 'ticket_value':
        if (!incrementData.meetsMinimum) {
          return currentProgress // No cambios si no cumple el mínimo
        }
        const newValueCount = currentProgress.currentCount + 1
        return {
          ...currentProgress,
          currentCount: newValueCount,
          progress: newValueCount / currentProgress.target,
          canRedeem: newValueCount >= currentProgress.target,
          lastUpdate: serverTimestamp(),
          history: [...(currentProgress.history || []), {
            ...newHistory,
            increment: 1,
            ticketValue: incrementData.ticketValue
          }]
        }

      case 'points':
        const newTotalPoints = currentProgress.currentPoints + incrementData.pointsEarned
        return {
          ...currentProgress,
          currentPoints: newTotalPoints,
          totalPointsEarned: (currentProgress.totalPointsEarned || 0) + incrementData.pointsEarned,
          availableRewards: incrementData.availableRewards,
          lastUpdate: serverTimestamp(),
          history: [...(currentProgress.history || []), {
            ...newHistory,
            pointsEarned: incrementData.pointsEarned,
            ticketValue: incrementData.ticketValue
          }]
        }

      default:
        throw new Error(`Tipo de programa no soportado: ${programType}`)
    }
  },

  /**
   * Obtiene las recompensas disponibles para un cliente
   */
  async getAvailableRewards(customerId, businessSlug) {
    try {
      const progress = await this.getCustomerProgress(customerId, businessSlug)
      const availableRewards = []

      for (const [programId, programProgress] of Object.entries(progress.programs || {})) {
        if (this.canRedeem(programProgress)) {
          availableRewards.push({
            programId,
            programType: programProgress.type,
            canRedeem: true,
            progress: programProgress
          })
        }
      }

      // Ordenar por prioridad (esto requeriría obtener los programas)
      return availableRewards
    } catch (error) {
      console.error('Error getting available rewards:', error)
      throw error
    }
  },

  /**
   * Verifica si un cliente puede canjear una recompensa
   */
  canRedeem(programProgress) {
    if (!programProgress) return false

    switch (programProgress.type) {
      case 'visits':
      case 'specific_product':
      case 'ticket_value':
        return programProgress.canRedeem || false

      case 'points':
        return programProgress.availableRewards && programProgress.availableRewards.length > 0

      default:
        return false
    }
  },

  /**
   * Procesa el canje de una recompensa
   */
  async processRedemption(customerId, businessSlug, programId, redemptionData) {
    try {
      const progressRef = doc(db, 'customers', customerId, 'loyaltyProgress', businessSlug)
      const progress = await this.getCustomerProgress(customerId, businessSlug)
      const programProgress = progress.programs?.[programId]

      if (!programProgress || !this.canRedeem(programProgress)) {
        throw new Error('No se puede canjear la recompensa en este momento')
      }

      // Generar código de canje
      const redemptionCode = this.generateRedemptionCode()
      
      const redemption = {
        date: serverTimestamp(),
        redemptionCode,
        reward: redemptionData.reward,
        entityId: redemptionData.entityId,
        redeemedBy: redemptionData.redeemedBy
      }

      // Actualizar progreso según el tipo
      let updatedProgress = { ...programProgress }

      switch (programProgress.type) {
        case 'visits':
        case 'specific_product':
        case 'ticket_value':
          // Resetear progreso después del canje
          updatedProgress = {
            ...programProgress,
            currentCount: 0,
            progress: 0,
            canRedeem: false,
            redemptions: [...(programProgress.redemptions || []), redemption],
            lastUpdate: serverTimestamp()
          }
          break

        case 'points':
          // Descontar puntos
          const pointsUsed = redemptionData.pointsUsed || 0
          updatedProgress = {
            ...programProgress,
            currentPoints: programProgress.currentPoints - pointsUsed,
            redemptions: [...(programProgress.redemptions || []), {
              ...redemption,
              pointsUsed
            }],
            lastUpdate: serverTimestamp()
          }
          break
      }

      await this.updateProgramProgress(customerId, businessSlug, programId, updatedProgress)

      return {
        success: true,
        redemptionCode,
        reward: redemptionData.reward
      }
    } catch (error) {
      console.error('Error processing redemption:', error)
      throw error
    }
  },

  /**
   * Genera un código único de canje
   */
  generateRedemptionCode() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `${timestamp}${random}`.toUpperCase()
  },

  /**
   * Actualiza el valor total de vida del cliente
   */
  async updateCustomerLifetimeValue(customerId, businessSlug, amount) {
    try {
      const progressRef = doc(db, 'customers', customerId, 'loyaltyProgress', businessSlug)
      
      const updateData = {
        totalLifetimeValue: increment(amount),
        lastVisit: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await updateDoc(progressRef, updateData)
      return { success: true }
    } catch (error) {
      console.error('Error updating customer lifetime value:', error)
      throw error
    }
  },

  /**
   * Obtiene el historial de canjes de un cliente
   */
  async getCustomerRedemptions(customerId, businessSlug) {
    try {
      const progress = await this.getCustomerProgress(customerId, businessSlug)
      const allRedemptions = []

      for (const [programId, programProgress] of Object.entries(progress.programs || {})) {
        if (programProgress.redemptions) {
          programProgress.redemptions.forEach(redemption => {
            allRedemptions.push({
              ...redemption,
              programId,
              programType: programProgress.type
            })
          })
        }
      }

      // Ordenar por fecha (más reciente primero)
      return allRedemptions.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date)
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date)
        return dateB - dateA
      })
    } catch (error) {
      console.error('Error getting customer redemptions:', error)
      throw error
    }
  }
}

export default customerLoyaltyService