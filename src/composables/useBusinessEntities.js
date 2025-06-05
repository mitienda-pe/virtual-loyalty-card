import { ref } from 'vue'
import { businessEntitiesService } from '@/services/businessEntitiesService'

export function useBusinessEntities() {
  const loading = ref(false)
  const error = ref(null)

  const addEntity = async (businessSlug, entityData) => {
    loading.value = true
    error.value = null
    
    try {
      const result = await businessEntitiesService.addEntity(businessSlug, entityData)
      return result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateEntity = async (businessSlug, entityId, entityData) => {
    loading.value = true
    error.value = null
    
    try {
      const result = await businessEntitiesService.updateEntity(businessSlug, entityId, entityData)
      return result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteEntity = async (businessSlug, entityId) => {
    loading.value = true
    error.value = null
    
    try {
      const result = await businessEntitiesService.deleteEntity(businessSlug, entityId)
      return result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const validateRUC = async (ruc, excludes = {}) => {
    try {
      const isValid = await businessEntitiesService.validateUniqueRUC(
        ruc, 
        excludes.businessSlug, 
        excludes.entityId
      )
      return isValid
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const validateRUCUnique = async (ruc) => {
    try {
      return await businessEntitiesService.validateUniqueRUC(ruc)
    } catch (err) {
      console.error('Error validating RUC:', err)
      return false
    }
  }

  const migrateBusinessToEntities = (business) => {
    // Migrar negocio legacy a la nueva estructura
    if (!business.businessEntities && business.ruc) {
      const entities = [{
        id: 'entity1',
        businessName: business.businessName || business.name,
        ruc: business.ruc,
        address: business.address || '',
        locations: []
      }]
      
      return {
        ...business,
        businessEntities: entities,
        primaryEntityId: 'entity1'
      }
    }
    
    return business
  }

  const updateLegacyFields = (business) => {
    // Actualizar campos legacy basados en la entidad principal
    if (business.businessEntities && business.businessEntities.length > 0) {
      const primaryEntity = business.businessEntities.find(e => e.id === business.primaryEntityId) || 
                           business.businessEntities[0]
      
      return {
        ...business,
        ruc: primaryEntity.ruc,
        businessName: primaryEntity.businessName,
        address: primaryEntity.address
      }
    }
    
    return business
  }

  return {
    loading,
    error,
    addEntity,
    updateEntity,
    deleteEntity,
    validateRUC,
    validateRUCUnique,
    migrateBusinessToEntities,
    updateLegacyFields
  }
}
