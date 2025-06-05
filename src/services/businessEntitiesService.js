import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  getDoc 
} from 'firebase/firestore'
import { db } from '@/firebase'

export const businessEntitiesService = {
  
  /**
   * Agrega una nueva entidad comercial a un negocio
   */
  async addEntity(businessSlug, entityData) {
    try {
      // Validar RUC único
      const isRucUnique = await this.validateUniqueRUC(entityData.ruc, businessSlug)
      if (!isRucUnique) {
        throw new Error('El RUC ya está registrado en otro negocio')
      }

      // Generar ID único para la entidad
      const entityId = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const newEntity = {
        ...entityData,
        id: entityId,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Actualizar el documento del negocio
      const businessRef = doc(db, 'businesses', businessSlug)
      await updateDoc(businessRef, {
        businessEntities: arrayUnion(newEntity),
        updatedAt: new Date()
      })

      // Actualizar campos legacy si es la primera entidad
      const businessDoc = await getDoc(businessRef)
      const businessData = businessDoc.data()
      
      if (!businessData.businessEntities || businessData.businessEntities.length === 1) {
        await updateDoc(businessRef, {
          ruc: entityData.ruc,
          businessName: entityData.businessName,
          address: entityData.address,
          primaryEntityId: entityId
        })
      }

      return { success: true, entityId, entity: newEntity }
    } catch (error) {
      console.error('Error adding business entity:', error)
      throw error
    }
  },

  /**
   * Actualiza una entidad comercial existente
   */
  async updateEntity(businessSlug, entityId, entityData) {
    try {
      // Validar RUC único (excluyendo la entidad actual)
      const isRucUnique = await this.validateUniqueRUC(entityData.ruc, businessSlug, entityId)
      if (!isRucUnique) {
        throw new Error('El RUC ya está registrado en otro negocio')
      }

      const businessRef = doc(db, 'businesses', businessSlug)
      const businessDoc = await getDoc(businessRef)
      const businessData = businessDoc.data()

      if (!businessData.businessEntities) {
        throw new Error('No se encontraron entidades para este negocio')
      }

      // Actualizar la entidad específica
      const updatedEntities = businessData.businessEntities.map(entity => {
        if (entity.id === entityId) {
          return {
            ...entity,
            ...entityData,
            updatedAt: new Date()
          }
        }
        return entity
      })

      // Actualizar el documento
      const updateData = {
        businessEntities: updatedEntities,
        updatedAt: new Date()
      }

      // Si actualizamos la entidad principal, actualizar campos legacy
      if (businessData.primaryEntityId === entityId) {
        updateData.ruc = entityData.ruc
        updateData.businessName = entityData.businessName
        updateData.address = entityData.address
      }

      await updateDoc(businessRef, updateData)

      const updatedEntity = updatedEntities.find(e => e.id === entityId)
      return { success: true, entity: updatedEntity }
    } catch (error) {
      console.error('Error updating business entity:', error)
      throw error
    }
  },

  /**
   * Elimina una entidad comercial
   */
  async deleteEntity(businessSlug, entityId) {
    try {
      const businessRef = doc(db, 'businesses', businessSlug)
      const businessDoc = await getDoc(businessRef)
      const businessData = businessDoc.data()

      if (!businessData.businessEntities || businessData.businessEntities.length <= 1) {
        throw new Error('No se puede eliminar la única entidad del negocio')
      }

      const entityToDelete = businessData.businessEntities.find(e => e.id === entityId)
      if (!entityToDelete) {
        throw new Error('Entidad no encontrada')
      }

      // Filtrar las entidades para eliminar la especificada
      const updatedEntities = businessData.businessEntities.filter(e => e.id !== entityId)

      const updateData = {
        businessEntities: updatedEntities,
        updatedAt: new Date()
      }

      // Si eliminamos la entidad principal, asignar una nueva
      if (businessData.primaryEntityId === entityId) {
        const newPrimaryEntity = updatedEntities[0]
        updateData.primaryEntityId = newPrimaryEntity.id
        updateData.ruc = newPrimaryEntity.ruc
        updateData.businessName = newPrimaryEntity.businessName
        updateData.address = newPrimaryEntity.address
      }

      await updateDoc(businessRef, updateData)

      return { success: true, deletedEntityId: entityId }
    } catch (error) {
      console.error('Error deleting business entity:', error)
      throw error
    }
  },

  /**
   * Valida que un RUC sea único en toda la base de datos
   */
  async validateUniqueRUC(ruc, excludeBusinessSlug = null, excludeEntityId = null) {
    try {
      // Buscar en la colección de negocios
      const businessesRef = collection(db, 'businesses')
      const snapshot = await getDocs(businessesRef)

      for (const doc of snapshot.docs) {
        const businessData = doc.data()
        const businessSlug = doc.id

        // Saltar el negocio actual si se especifica
        if (excludeBusinessSlug && businessSlug === excludeBusinessSlug) {
          // Verificar solo en otras entidades del mismo negocio
          if (businessData.businessEntities) {
            const duplicateInSameBusiness = businessData.businessEntities.some(entity => 
              entity.ruc === ruc && entity.id !== excludeEntityId
            )
            if (duplicateInSameBusiness) {
              return false
            }
          }
          continue
        }

        // Verificar RUC legacy
        if (businessData.ruc === ruc) {
          return false
        }

        // Verificar en businessEntities
        if (businessData.businessEntities) {
          const duplicate = businessData.businessEntities.some(entity => entity.ruc === ruc)
          if (duplicate) {
            return false
          }
        }
      }

      return true
    } catch (error) {
      console.error('Error validating RUC uniqueness:', error)
      throw error
    }
  },

  /**
   * Establece una entidad como principal
   */
  async setPrimaryEntity(businessSlug, entityId) {
    try {
      const businessRef = doc(db, 'businesses', businessSlug)
      const businessDoc = await getDoc(businessRef)
      const businessData = businessDoc.data()

      if (!businessData.businessEntities) {
        throw new Error('No se encontraron entidades para este negocio')
      }

      const primaryEntity = businessData.businessEntities.find(e => e.id === entityId)
      if (!primaryEntity) {
        throw new Error('Entidad no encontrada')
      }

      // Actualizar entidad principal y campos legacy
      await updateDoc(businessRef, {
        primaryEntityId: entityId,
        ruc: primaryEntity.ruc,
        businessName: primaryEntity.businessName,
        address: primaryEntity.address,
        updatedAt: new Date()
      })

      return { success: true, primaryEntityId: entityId }
    } catch (error) {
      console.error('Error setting primary entity:', error)
      throw error
    }
  },

  /**
   * Migra un negocio legacy a la nueva estructura
   */
  async migrateLegacyBusiness(businessSlug) {
    try {
      const businessRef = doc(db, 'businesses', businessSlug)
      const businessDoc = await getDoc(businessRef)
      const businessData = businessDoc.data()

      // Si ya tiene businessEntities, no necesita migración
      if (businessData.businessEntities) {
        return { success: true, alreadyMigrated: true }
      }

      // Crear entidad principal desde datos legacy
      const primaryEntity = {
        id: 'entity1',
        businessName: businessData.businessName || businessData.name,
        ruc: businessData.ruc || '',
        address: businessData.address || '',
        locations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Actualizar el documento con la nueva estructura
      await updateDoc(businessRef, {
        businessEntities: [primaryEntity],
        primaryEntityId: 'entity1',
        updatedAt: new Date()
      })

      return { success: true, migratedEntity: primaryEntity }
    } catch (error) {
      console.error('Error migrating legacy business:', error)
      throw error
    }
  }
}
