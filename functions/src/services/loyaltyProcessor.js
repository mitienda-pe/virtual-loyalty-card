const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Procesa un ticket para todos los programas de lealtad activos
 * Adaptado para múltiples entidades comerciales
 */
async function processTicketForLoyalty(ticketData, customer, business) {
  try {
    console.log('🎯 Procesando programas de lealtad para ticket:', ticketData.invoiceNumber);
    
    // Obtener todos los programas activos ordenados por prioridad
    const activePrograms = await getActivePrograms(business.slug);
    console.log(`📋 Encontrados ${activePrograms.length} programas activos`);
    
    if (activePrograms.length === 0) {
      console.log('ℹ️ No hay programas de lealtad activos para este negocio');
      return [];
    }

    // Validar que el ticket no haya sido procesado anteriormente
    const isDuplicate = await checkDuplicateTicketProcessing(ticketData.id, customer.phoneNumber);
    if (isDuplicate) {
      console.log('⚠️ Ticket ya procesado para programas de lealtad');
      return [];
    }
    
    // Procesar cada programa según su tipo
    const results = [];
    for (const program of activePrograms) {
      try {
        const result = await processProgram(program, customer, ticketData, business);
        results.push({
          programId: program.id,
          programName: program.name,
          programType: program.type,
          ...result
        });
        
        console.log(`✅ Programa ${program.name} procesado:`, result);
      } catch (error) {
        console.error(`❌ Error procesando programa ${program.name}:`, error);
        results.push({
          programId: program.id,
          programName: program.name,
          error: error.message
        });
      }
    }
    
    // Actualizar estadísticas de programas
    await updateProgramStats(activePrograms, results, ticketData);
    
    // Marcar ticket como procesado
    await markTicketProcessed(ticketData.id, customer.phoneNumber, results);
    
    console.log('🎉 Procesamiento de programas de lealtad completado:', results);
    return results;
    
  } catch (error) {
    console.error('💥 Error procesando programas de lealtad:', error);
    throw error;
  }
}

/**
 * Obtiene programas activos de un negocio
 */
async function getActivePrograms(businessSlug) {
  try {
    const programsRef = db.collection('businesses').doc(businessSlug).collection('loyaltyPrograms');
    const snapshot = await programsRef
      .where('status', '==', 'active')
      .orderBy('priority')
      .get();
    
    const programs = [];
    const now = new Date();
    
    snapshot.forEach(doc => {
      const program = { id: doc.id, ...doc.data() };
      
      // Filtrar por fechas de validez
      const startDate = program.startDate ? new Date(program.startDate) : null;
      const endDate = program.endDate ? new Date(program.endDate) : null;
      
      if (startDate && now < startDate) return;
      if (endDate && now > endDate) return;
      
      programs.push(program);
    });
    
    return programs;
  } catch (error) {
    console.error('Error obteniendo programas activos:', error);
    return [];
  }
}

/**
 * Procesa un programa específico según su tipo
 */
async function processProgram(program, customer, ticketData, business) {
  console.log(`🔄 Procesando programa tipo ${program.type}: ${program.name}`);
  
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

/**
 * Procesa programa de visitas
 */
async function processVisitProgram(program, customer, ticketData) {
  console.log('👥 Procesando programa de visitas');
  
  // Todo ticket válido cuenta como una visita
  const progress = await incrementProgramProgress(
    customer.phoneNumber, 
    ticketData.businessSlug, 
    program.id, 
    'visits',
    {
      target: program.config.target,
      ticketId: ticketData.id,
      entityId: ticketData.entityId
    }
  );
  
  return {
    eligible: true,
    canRedeem: progress.canRedeem,
    progress: progress.currentCount,
    target: progress.target,
    type: 'visits'
  };
}

/**
 * Procesa programa de producto específico
 */
async function processSpecificProductProgram(program, customer, ticketData) {
  console.log('🎯 Procesando programa de producto específico');
  
  // Verificar si el ticket contiene el producto específico
  const extractedText = ticketData.extractedText || '';
  const items = ticketData.items || [];
  
  let hasTargetProduct = false;
  let productDetails = null;
  
  // Buscar en texto extraído y en items
  for (const keyword of program.config.productKeywords) {
    const keywordLower = keyword.toLowerCase();
    
    // Buscar en texto extraído
    if (extractedText.toLowerCase().includes(keywordLower)) {
      hasTargetProduct = true;
      productDetails = { keyword, foundIn: 'extractedText' };
      break;
    }
    
    // Buscar en items específicos
    const matchingItem = items.find(item => 
      item.description && item.description.toLowerCase().includes(keywordLower)
    );
    
    if (matchingItem) {
      hasTargetProduct = true;
      productDetails = { 
        keyword, 
        foundIn: 'items', 
        item: matchingItem 
      };
      break;
    }
  }
  
  if (!hasTargetProduct) {
    console.log('❌ Producto específico no encontrado en el ticket');
    return {
      eligible: false,
      canRedeem: false,
      progress: 0,
      reason: 'Producto no encontrado',
      type: 'specific_product'
    };
  }
  
  console.log('✅ Producto específico encontrado:', productDetails);
  
  const progress = await incrementProgramProgress(
    customer.phoneNumber, 
    ticketData.businessSlug, 
    program.id, 
    'specific_product',
    {
      target: program.config.target,
      ticketId: ticketData.id,
      entityId: ticketData.entityId,
      productFound: true,
      productDetails
    }
  );
  
  return {
    eligible: true,
    canRedeem: progress.canRedeem,
    progress: progress.currentCount,
    target: progress.target,
    productDetails,
    type: 'specific_product'
  };
}

/**
 * Procesa programa de valor de ticket
 */
async function processTicketValueProgram(program, customer, ticketData) {
  console.log('💰 Procesando programa de valor de ticket');
  
  const ticketValue = parseFloat(ticketData.amount) || 0;
  const minValue = program.config.minTicketValue;
  const meetsMinimum = ticketValue >= minValue;
  
  console.log(`Valor del ticket: ${ticketValue}, Mínimo requerido: ${minValue}, Cumple: ${meetsMinimum}`);
  
  if (!meetsMinimum) {
    return {
      eligible: false,
      canRedeem: false,
      progress: 0,
      reason: `Ticket de ${ticketValue} no alcanza el mínimo de ${minValue}`,
      type: 'ticket_value'
    };
  }
  
  const progress = await incrementProgramProgress(
    customer.phoneNumber, 
    ticketData.businessSlug, 
    program.id, 
    'ticket_value',
    {
      target: program.config.target,
      ticketId: ticketData.id,
      entityId: ticketData.entityId,
      meetsMinimum: true,
      ticketValue
    }
  );
  
  return {
    eligible: true,
    canRedeem: progress.canRedeem,
    progress: progress.currentCount,
    target: progress.target,
    ticketValue,
    type: 'ticket_value'
  };
}

/**
 * Procesa programa de puntos
 */
async function processPointsProgram(program, customer, ticketData) {
  console.log('⭐ Procesando programa de puntos');
  
  const ticketValue = parseFloat(ticketData.amount) || 0;
  const pointsPerDollar = program.config.pointsPerDollar || 1;
  const pointsEarned = Math.floor(ticketValue * pointsPerDollar);
  
  console.log(`Ticket: ${ticketValue}, Puntos por dólar: ${pointsPerDollar}, Puntos ganados: ${pointsEarned}`);
  
  if (pointsEarned <= 0) {
    return {
      eligible: false,
      pointsEarned: 0,
      reason: 'No se ganaron puntos con este ticket',
      type: 'points'
    };
  }
  
  const progress = await incrementProgramProgress(
    customer.phoneNumber, 
    ticketData.businessSlug, 
    program.id, 
    'points',
    {
      ticketId: ticketData.id,
      entityId: ticketData.entityId,
      pointsEarned,
      ticketValue
    }
  );
  
  // Calcular recompensas disponibles
  const availableRewards = (program.config.rewards || []).filter(
    reward => progress.currentPoints >= reward.points
  );
  
  return {
    eligible: true,
    pointsEarned,
    totalPoints: progress.currentPoints,
    availableRewards: availableRewards.map(r => ({
      points: r.points,
      reward: r.reward,
      canRedeem: true
    })),
    type: 'points'
  };
}

/**
 * Incrementa el progreso de un programa para un cliente
 */
async function incrementProgramProgress(customerId, businessSlug, programId, programType, incrementData) {
  const progressRef = db.collection('customers').doc(customerId)
    .collection('loyaltyProgress').doc(businessSlug);
  
  try {
    const progressDoc = await progressRef.get();
    let progressData = progressDoc.exists ? progressDoc.data() : {
      customerId,
      businessSlug,
      programs: {},
      totalLifetimeValue: 0,
      lastVisit: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Obtener o crear progreso del programa específico
    let programProgress = progressData.programs[programId];
    
    if (!programProgress) {
      programProgress = createInitialProgress(programType, incrementData);
    } else {
      programProgress = updateExistingProgress(programProgress, programType, incrementData);
    }
    
    // Actualizar documento
    progressData.programs[programId] = programProgress;
    progressData.lastVisit = admin.firestore.FieldValue.serverTimestamp();
    progressData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await progressRef.set(progressData, { merge: true });
    
    return programProgress;
  } catch (error) {
    console.error('Error incrementando progreso del programa:', error);
    throw error;
  }
}

/**
 * Crea progreso inicial para un programa
 */
function createInitialProgress(programType, incrementData) {
  const baseProgress = {
    type: programType,
    lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
    history: [],
    redemptions: []
  };

  const historyEntry = {
    date: admin.firestore.FieldValue.serverTimestamp(),
    ticketId: incrementData.ticketId,
    entityId: incrementData.entityId
  };

  switch (programType) {
    case 'visits':
      return {
        ...baseProgress,
        currentCount: 1,
        target: incrementData.target,
        progress: 1 / incrementData.target,
        canRedeem: 1 >= incrementData.target,
        history: [{ ...historyEntry, increment: 1 }]
      };

    case 'specific_product':
      return {
        ...baseProgress,
        currentCount: incrementData.productFound ? 1 : 0,
        target: incrementData.target,
        progress: incrementData.productFound ? 1 / incrementData.target : 0,
        canRedeem: incrementData.productFound && 1 >= incrementData.target,
        history: incrementData.productFound ? [{
          ...historyEntry,
          increment: 1,
          productDetails: incrementData.productDetails
        }] : []
      };

    case 'ticket_value':
      return {
        ...baseProgress,
        currentCount: incrementData.meetsMinimum ? 1 : 0,
        target: incrementData.target,
        progress: incrementData.meetsMinimum ? 1 / incrementData.target : 0,
        canRedeem: incrementData.meetsMinimum && 1 >= incrementData.target,
        history: incrementData.meetsMinimum ? [{
          ...historyEntry,
          increment: 1,
          ticketValue: incrementData.ticketValue
        }] : []
      };

    case 'points':
      return {
        ...baseProgress,
        currentPoints: incrementData.pointsEarned,
        totalPointsEarned: incrementData.pointsEarned,
        history: [{
          ...historyEntry,
          pointsEarned: incrementData.pointsEarned,
          ticketValue: incrementData.ticketValue
        }]
      };

    default:
      throw new Error(`Tipo de programa no soportado: ${programType}`);
  }
}

/**
 * Actualiza progreso existente
 */
function updateExistingProgress(currentProgress, programType, incrementData) {
  const historyEntry = {
    date: admin.firestore.FieldValue.serverTimestamp(),
    ticketId: incrementData.ticketId,
    entityId: incrementData.entityId
  };

  switch (programType) {
    case 'visits':
      const newCount = currentProgress.currentCount + 1;
      return {
        ...currentProgress,
        currentCount: newCount,
        progress: newCount / currentProgress.target,
        canRedeem: newCount >= currentProgress.target,
        lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
        history: [...(currentProgress.history || []), { ...historyEntry, increment: 1 }]
      };

    case 'specific_product':
      if (!incrementData.productFound) return currentProgress;
      const newProductCount = currentProgress.currentCount + 1;
      return {
        ...currentProgress,
        currentCount: newProductCount,
        progress: newProductCount / currentProgress.target,
        canRedeem: newProductCount >= currentProgress.target,
        lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
        history: [...(currentProgress.history || []), {
          ...historyEntry,
          increment: 1,
          productDetails: incrementData.productDetails
        }]
      };

    case 'ticket_value':
      if (!incrementData.meetsMinimum) return currentProgress;
      const newValueCount = currentProgress.currentCount + 1;
      return {
        ...currentProgress,
        currentCount: newValueCount,
        progress: newValueCount / currentProgress.target,
        canRedeem: newValueCount >= currentProgress.target,
        lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
        history: [...(currentProgress.history || []), {
          ...historyEntry,
          increment: 1,
          ticketValue: incrementData.ticketValue
        }]
      };

    case 'points':
      const newTotalPoints = currentProgress.currentPoints + incrementData.pointsEarned;
      return {
        ...currentProgress,
        currentPoints: newTotalPoints,
        totalPointsEarned: (currentProgress.totalPointsEarned || 0) + incrementData.pointsEarned,
        lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
        history: [...(currentProgress.history || []), {
          ...historyEntry,
          pointsEarned: incrementData.pointsEarned,
          ticketValue: incrementData.ticketValue
        }]
      };

    default:
      throw new Error(`Tipo de programa no soportado: ${programType}`);
  }
}

/**
 * Verifica si un ticket ya fue procesado para lealtad
 */
async function checkDuplicateTicketProcessing(ticketId, customerId) {
  try {
    const processedRef = db.collection('loyalty_processed_tickets').doc(`${customerId}_${ticketId}`);
    const doc = await processedRef.get();
    return doc.exists;
  } catch (error) {
    console.error('Error verificando ticket duplicado:', error);
    return false;
  }
}

/**
 * Marca un ticket como procesado
 */
async function markTicketProcessed(ticketId, customerId, results) {
  try {
    const processedRef = db.collection('loyalty_processed_tickets').doc(`${customerId}_${ticketId}`);
    await processedRef.set({
      ticketId,
      customerId,
      results,
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error marcando ticket como procesado:', error);
  }
}

/**
 * Actualiza estadísticas de programas
 */
async function updateProgramStats(programs, results, ticketData) {
  try {
    const batch = db.batch();
    
    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];
      const result = results[i];
      
      if (result && result.eligible && !result.error) {
        const programRef = db.collection('businesses')
          .doc(ticketData.businessSlug)
          .collection('loyaltyPrograms')
          .doc(program.id);
        
        const updates = {
          'stats.totalRevenue': admin.firestore.FieldValue.increment(ticketData.amount || 0),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Solo incrementar participantes si es la primera vez que participa
        if (result.progress === 1 || (result.type === 'points' && result.pointsEarned > 0)) {
          updates['stats.totalParticipants'] = admin.firestore.FieldValue.increment(1);
        }
        
        // Incrementar canjes si aplica
        if (result.canRedeem) {
          updates['stats.rewardsRedeemed'] = admin.firestore.FieldValue.increment(1);
        }
        
        batch.update(programRef, updates);
      }
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error actualizando estadísticas de programas:', error);
  }
}

module.exports = {
  processTicketForLoyalty,
  getActivePrograms,
  processProgram,
  incrementProgramProgress
};