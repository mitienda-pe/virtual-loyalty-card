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
  limit as firestoreLimit
} from 'firebase/firestore'
import { db } from '@/firebase'
import { businessEntitiesService } from './businessEntitiesService'

export const businessService = {
  
  /**
   * Obtiene las compras de un negocio con filtros opcionales
   */
  async getPurchases(businessSlug, filters = {}) {
    try {
      const { entityId, startDate, endDate, limit, verified, phoneNumber } = filters
      
      let q = query(
        collection(db, 'business_invoices', businessSlug, 'purchases'),
        orderBy('date', 'desc')
      )
      
      // Aplicar filtros
      if (entityId && entityId !== 'all') {
        q = query(q, where('entityId', '==', entityId))
      }
      
      if (startDate) {
        q = query(q, where('date', '>=', startDate))
      }
      
      if (endDate) {
        q = query(q, where('date', '<=', endDate))
      }
      
      if (verified !== undefined) {
        q = query(q, where('verified', '==', verified))
      }
      
      if (phoneNumber) {
        q = query(q, where('phoneNumber', '==', phoneNumber))
      }
      
      if (limit) {
        q = query(q, firestoreLimit(limit))
      }
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error getting purchases:', error)
      throw error
    }
  },

  /**
   * Obtiene métricas de un negocio por entidad
   */
  async getEntityMetrics(businessSlug, entityId) {
    try {
      const purchases = await this.getPurchases(businessSlug, { entityId })
      
      const metrics = {
        totalPurchases: purchases.length,
        totalRevenue: purchases.reduce((sum, p) => sum + (p.amount || 0), 0),
        uniqueCustomers: new Set(purchases.map(p => p.phoneNumber)).size,
        lastPurchase: purchases.length > 0 ? purchases[0].date : null
      }
      
      metrics.averageTicket = metrics.totalPurchases > 0 ? 
        metrics.totalRevenue / metrics.totalPurchases : 0
      
      return metrics
    } catch (error) {
      console.error('Error getting entity metrics:', error)
      throw error
    }
  },

  /**
   * Registra una nueva compra
   */
  async registerPurchase(purchaseData) {
    try {
      const {
        businessSlug,
        phoneNumber,
        amount,
        entityId,
        invoiceNumber,
        ruc,
        businessName,
        address,
        customerName,
        verified = true,
        manualEntry = false,
        enteredBy = null,
        description = '',
        date = new Date()
      } = purchaseData
      
      // Validaciones básicas
      if (!businessSlug || !phoneNumber || !amount || !entityId || !invoiceNumber) {
        throw new Error('Faltan campos requeridos para registrar la compra')
      }
      
      // Crear ID único para la compra
      const purchaseId = ruc && invoiceNumber ? `${ruc}-${invoiceNumber}` : null
      
      const purchaseDoc = {
        id: purchaseId,
        phoneNumber,
        customerName: customerName || 'Cliente',
        amount: parseFloat(amount),
        date: date instanceof Date ? date : new Date(date),
        entityId,
        invoiceNumber,
        ruc,
        businessName,
        address,
        verified,
        manualEntry,
        description,
        ...(enteredBy && { enteredBy }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Usar ID personalizado si está disponible
      const purchaseRef = purchaseId ? 
        doc(db, 'business_invoices', businessSlug, 'purchases', purchaseId) :
        doc(collection(db, 'business_invoices', businessSlug, 'purchases'))
      
      await setDoc(purchaseRef, purchaseDoc)
      
      return {
        id: purchaseRef.id,
        ...purchaseDoc
      }
    } catch (error) {
      console.error('Error registering purchase:', error)
      throw error
    }
  },

  /**
   * Obtiene estadísticas consolidadas de todas las entidades
   */
  async getConsolidatedMetrics(businessSlug) {
    try {
      const allPurchases = await this.getPurchases(businessSlug)
      
      const metrics = {
        totalPurchases: allPurchases.length,
        totalRevenue: allPurchases.reduce((sum, p) => sum + (p.amount || 0), 0),
        uniqueCustomers: new Set(allPurchases.map(p => p.phoneNumber)).size,
        entitiesActive: new Set(allPurchases.map(p => p.entityId)).size
      }
      
      metrics.averageTicket = metrics.totalPurchases > 0 ? 
        metrics.totalRevenue / metrics.totalPurchases : 0
      
      return metrics
    } catch (error) {
      console.error('Error getting consolidated metrics:', error)
      throw error
    }
  },

  /**
   * Obtiene métricas detalladas por entidad para análisis
   */
  async getDetailedEntityMetrics(businessSlug) {
    try {
      const business = await this.getBusinessById(businessSlug)
      if (!business || !business.businessEntities) {
        return []
      }

      const entityMetrics = []
      
      for (const entity of business.businessEntities) {
        const metrics = await this.getEntityMetrics(businessSlug, entity.id)
        
        entityMetrics.push({
          entityId: entity.id,
          entityName: entity.businessName,
          entityRuc: entity.ruc,
          entityAddress: entity.address,
          ...metrics
        })
      }

      return entityMetrics
    } catch (error) {
      console.error('Error getting detailed entity metrics:', error)
      throw error
    }
  },

  /**
   * Obtiene datos para gráficos de tendencias por período
   */
  async getTrendsData(businessSlug, options = {}) {
    try {
      const { period = '30d', entityId = null, groupBy = 'day' } = options
      
      // Calcular fecha de inicio según el período
      const now = new Date()
      const startDate = this.calculateStartDate(now, period)
      
      // Obtener compras del período
      const filters = { startDate }
      if (entityId && entityId !== 'all') {
        filters.entityId = entityId
      }
      
      const purchases = await this.getPurchases(businessSlug, filters)
      
      // Agrupar datos según el período
      return this.groupPurchasesByPeriod(purchases, groupBy)
    } catch (error) {
      console.error('Error getting trends data:', error)
      throw error
    }
  },

  /**
   * Calcula fecha de inicio según el período
   */
  calculateStartDate(endDate, period) {
    const date = new Date(endDate)
    
    switch (period) {
      case '7d':
        date.setDate(date.getDate() - 7)
        break
      case '30d':
        date.setDate(date.getDate() - 30)
        break
      case '90d':
        date.setDate(date.getDate() - 90)
        break
      case '1y':
        date.setFullYear(date.getFullYear() - 1)
        break
      default:
        date.setDate(date.getDate() - 30)
    }
    
    return date
  },

  /**
   * Agrupa compras por período especificado
   */
  groupPurchasesByPeriod(purchases, groupBy = 'day') {
    const grouped = {}
    
    purchases.forEach(purchase => {
      const date = purchase.date?.toDate ? purchase.date.toDate() : new Date(purchase.date)
      let key
      
      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0]
          break
        case 'week':
          const startOfWeek = new Date(date)
          startOfWeek.setDate(date.getDate() - date.getDay())
          key = startOfWeek.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }
      
      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          purchases: 0,
          revenue: 0,
          customers: new Set()
        }
      }
      
      grouped[key].purchases++
      grouped[key].revenue += purchase.amount || 0
      grouped[key].customers.add(purchase.phoneNumber)
    })
    
    // Convertir sets a números y ordenar
    return Object.values(grouped)
      .map(item => ({
        ...item,
        customers: item.customers.size
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  },

  /**
   * Obtiene top clientes por entidad
   */
  async getTopCustomersByEntity(businessSlug, entityId, limit = 10) {
    try {
      const purchases = await this.getPurchases(businessSlug, { entityId })
      
      // Agrupar por cliente
      const customerStats = {}
      purchases.forEach(purchase => {
        const phone = purchase.phoneNumber
        if (!customerStats[phone]) {
          customerStats[phone] = {
            phoneNumber: phone,
            customerName: purchase.customerName || 'Cliente',
            purchases: 0,
            totalSpent: 0,
            lastPurchase: null
          }
        }
        
        customerStats[phone].purchases++
        customerStats[phone].totalSpent += purchase.amount || 0
        
        const purchaseDate = purchase.date?.toDate ? purchase.date.toDate() : new Date(purchase.date)
        if (!customerStats[phone].lastPurchase || purchaseDate > customerStats[phone].lastPurchase) {
          customerStats[phone].lastPurchase = purchaseDate
        }
      })
      
      // Ordenar por total gastado y limitar
      return Object.values(customerStats)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, limit)
    } catch (error) {
      console.error('Error getting top customers by entity:', error)
      throw error
    }
  },
  
  /**
   * Obtiene todos los negocios
   */
  async getAllBusinesses() {
    try {
      const businessesRef = collection(db, 'businesses')
      const q = query(businessesRef, orderBy('name'))
      const snapshot = await getDocs(q)
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        slug: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error getting businesses:', error)
      throw error
    }
  },

  /**
   * Obtiene un negocio por ID (alias para getBusinessBySlug)
   */
  async getBusinessById(id) {
    return await this.getBusinessBySlug(id)
  },
  
  /**
   * Obtiene un negocio por slug
   */
  async getBusinessBySlug(slug) {
    try {
      const docRef = doc(db, 'businesses', slug)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        return null
      }
      
      let businessData = {
        id: docSnap.id,
        slug: docSnap.id,
        ...docSnap.data()
      }
      
      // Auto-migrar si es necesario
      if (!businessData.businessEntities && businessData.ruc) {
        businessData = this.migrateToEntities(businessData)
        // Guardar la migración
        await this.updateBusiness(slug, businessData)
      }
      
      return businessData
    } catch (error) {
      console.error('Error getting business:', error)
      throw error
    }
  },

  /**
   * Crea un nuevo negocio
   */
  async createBusiness(businessData) {
    try {
      // Validar slug único
      const existing = await this.getBusinessBySlug(businessData.slug)
      if (existing) {
        throw new Error('Ya existe un negocio con este slug')
      }
      
      // Validar entidades
      if (!businessData.businessEntities || businessData.businessEntities.length === 0) {
        throw new Error('Debe tener al menos una entidad comercial')
      }
      
      // Validar RUCs únicos
      for (const entity of businessData.businessEntities) {
        const isUnique = await businessEntitiesService.validateUniqueRUC(entity.ruc)
        if (!isUnique) {
          throw new Error(`El RUC ${entity.ruc} ya está registrado`)
        }
      }
      
      // Asegurar campos legacy
      const dataWithLegacy = this.updateLegacyFields(businessData)
      
      // Agregar timestamps
      dataWithLegacy.createdAt = new Date()
      dataWithLegacy.updatedAt = new Date()
      dataWithLegacy.active = true
      
      const docRef = doc(db, 'businesses', businessData.slug)
      await setDoc(docRef, dataWithLegacy)
      
      return {
        id: businessData.slug,
        slug: businessData.slug,
        ...dataWithLegacy
      }
    } catch (error) {
      console.error('Error creating business:', error)
      throw error
    }
  },

  /**
   * Actualiza un negocio existente
   */
  async updateBusiness(slug, businessData) {
    try {
      // Validar que el negocio existe
      const existing = await this.getBusinessBySlug(slug)
      if (!existing) {
        throw new Error('Negocio no encontrado')
      }
      
      // Validar entidades si se proporcionan
      if (businessData.businessEntities) {
        if (businessData.businessEntities.length === 0) {
          throw new Error('Debe tener al menos una entidad comercial')
        }
        
        // Validar RUCs únicos (excluyendo el negocio actual)
        for (const entity of businessData.businessEntities) {
          const isUnique = await businessEntitiesService.validateUniqueRUC(
            entity.ruc, 
            slug, 
            entity.id
          )
          if (!isUnique) {
            throw new Error(`El RUC ${entity.ruc} ya está registrado en otro negocio`)
          }
        }
      }
      
      // Asegurar campos legacy si hay entidades
      let dataToUpdate = { ...businessData }
      if (businessData.businessEntities) {
        dataToUpdate = this.updateLegacyFields(dataToUpdate)
      }
      
      // Agregar timestamp de actualización
      dataToUpdate.updatedAt = new Date()
      
      const docRef = doc(db, 'businesses', slug)
      await updateDoc(docRef, dataToUpdate)
      
      // Retornar datos actualizados
      return await this.getBusinessBySlug(slug)
    } catch (error) {
      console.error('Error updating business:', error)
      throw error
    }
  },

  /**
   * Elimina un negocio
   */
  async deleteBusiness(slug) {
    try {
      // Verificar que el negocio existe
      const existing = await this.getBusinessBySlug(slug)
      if (!existing) {
        throw new Error('Negocio no encontrado')
      }
      
      // TODO: Verificar que no tenga clientes/compras antes de eliminar
      // Por ahora solo marcamos como inactivo
      await this.updateBusiness(slug, { active: false })
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting business:', error)
      throw error
    }
  },

  /**
   * Busca negocios por término
   */
  async searchBusinesses(searchTerm, limit = 10) {
    try {
      const businessesRef = collection(db, 'businesses')
      const q = query(
        businessesRef,
        where('active', '==', true),
        orderBy('name'),
        firestoreLimit(limit)
      )
      
      const snapshot = await getDocs(q)
      const businesses = snapshot.docs.map(doc => ({
        id: doc.id,
        slug: doc.id,
        ...doc.data()
      }))
      
      // Filtrar por término de búsqueda (client-side debido a limitaciones de Firestore)
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        return businesses.filter(business => 
          business.name.toLowerCase().includes(term) ||
          business.description?.toLowerCase().includes(term) ||
          business.businessEntities?.some(entity => 
            entity.businessName.toLowerCase().includes(term) ||
            entity.ruc.includes(term)
          )
        )
      }
      
      return businesses
    } catch (error) {
      console.error('Error searching businesses:', error)
      throw error
    }
  },

  /**
   * Busca un negocio por RUC
   */
  async findBusinessByRUC(ruc) {
    try {
      const businessesRef = collection(db, 'businesses')
      const snapshot = await getDocs(businessesRef)
      
      for (const doc of snapshot.docs) {
        const data = doc.data()
        
        // Buscar en RUC legacy
        if (data.ruc === ruc) {
          return {
            id: doc.id,
            slug: doc.id,
            ...data
          }
        }
        
        // Buscar en businessEntities
        if (data.businessEntities) {
          const matchingEntity = data.businessEntities.find(entity => entity.ruc === ruc)
          if (matchingEntity) {
            return {
              id: doc.id,
              slug: doc.id,
              ...data,
              matchingEntity
            }
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('Error finding business by RUC:', error)
      throw error
    }
  },

  /**
   * Migra un negocio legacy a la nueva estructura
   */
  migrateToEntities(business) {
    if (!business.businessEntities && business.ruc) {
      const entities = [{
        id: 'entity1',
        businessName: business.businessName || business.name,
        ruc: business.ruc,
        address: business.address || '',
        locations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }]
      
      return {
        ...business,
        businessEntities: entities,
        primaryEntityId: 'entity1'
      }
    }
    
    return business
  },

  /**
   * Actualiza campos legacy basados en la entidad principal
   */
  updateLegacyFields(business) {
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
  },

  /**
   * Obtiene estadísticas de un negocio
   */
  async getBusinessStats(slug) {
    try {
      // TODO: Implementar obtención de estadísticas
      // Por ahora retornamos datos básicos
      const business = await this.getBusinessBySlug(slug)
      if (!business) {
        throw new Error('Negocio no encontrado')
      }
      
      return {
        totalCustomers: 0,
        totalPurchases: 0,
        totalRevenue: 0,
        entitiesCount: business.businessEntities?.length || 0,
        rucsCount: business.businessEntities?.length || (business.ruc ? 1 : 0)
      }
    } catch (error) {
      console.error('Error getting business stats:', error)
      throw error
    }
  },

  /**
   * Valida los datos de un negocio antes de guardarlo
   */
  validateBusinessData(businessData) {
    const errors = []
    
    // Validaciones básicas
    if (!businessData.name?.trim()) {
      errors.push('El nombre comercial es requerido')
    }
    
    if (!businessData.slug?.trim()) {
      errors.push('El slug es requerido')
    }
    
    // Validar slug format
    if (businessData.slug && !/^[a-z0-9-]+$/.test(businessData.slug)) {
      errors.push('El slug solo puede contener letras minúsculas, números y guiones')
    }
    
    // Validar entidades
    if (!businessData.businessEntities || businessData.businessEntities.length === 0) {
      errors.push('Debe tener al menos una entidad comercial')
    } else {
      businessData.businessEntities.forEach((entity, index) => {
        if (!entity.businessName?.trim()) {
          errors.push(`La razón social de la entidad ${index + 1} es requerida`)
        }
        
        if (!entity.ruc?.trim()) {
          errors.push(`El RUC de la entidad ${index + 1} es requerido`)
        } else if (!/^[0-9]{11}$/.test(entity.ruc)) {
          errors.push(`El RUC de la entidad ${index + 1} debe tener 11 dígitos`)
        }
        
        if (!entity.address?.trim()) {
          errors.push(`La dirección de la entidad ${index + 1} es requerida`)
        }
      })
      
      // Validar RUCs únicos dentro del mismo negocio
      const rucs = businessData.businessEntities.map(e => e.ruc)
      const uniqueRucs = new Set(rucs)
      if (rucs.length !== uniqueRucs.size) {
        errors.push('No puede haber RUCs duplicados dentro del mismo negocio')
      }
    }
    
    // Validar configuración
    if (businessData.config) {
      if (businessData.config.purchasesRequired && businessData.config.purchasesRequired < 1) {
        errors.push('Las compras requeridas deben ser al menos 1')
      }
      
      if (businessData.config.minAmount && businessData.config.minAmount < 0) {
        errors.push('El monto mínimo no puede ser negativo')
      }
      
      if (businessData.config.expirationDays && businessData.config.expirationDays < 1) {
        errors.push('Los días de expiración deben ser al menos 1')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export default businessService
