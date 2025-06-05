<template>
  <div class="entity-card" :class="{ 'ring-2 ring-blue-500': isPrimary }">
    <div class="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <!-- Información de la entidad -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2">
          <h4 class="text-lg font-medium text-gray-900 truncate">
            {{ entity.businessName }}
          </h4>
          <span 
            v-if="isPrimary" 
            class="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full"
          >
            Principal
          </span>
        </div>
        
        <div class="space-y-1 text-sm text-gray-600">
          <p class="flex items-center gap-2">
            <span class="font-medium">RUC:</span>
            <span class="font-mono">{{ entity.ruc }}</span>
          </p>
          
          <p class="flex items-start gap-2">
            <span class="font-medium whitespace-nowrap">Dirección:</span>
            <span class="break-words">{{ entity.address }}</span>
          </p>
        </div>
        
        <!-- Ubicaciones/Locales -->
        <div v-if="entity.locations?.length" class="mt-3">
          <p class="text-xs font-medium text-gray-500 mb-1">Ubicaciones:</p>
          <div class="flex flex-wrap gap-1">
            <span 
              v-for="location in entity.locations" 
              :key="location"
              class="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md"
            >
              {{ location }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Acciones -->
      <div class="flex items-center gap-2 ml-4">
        <!-- Botón establecer como principal -->
        <button
          v-if="!isPrimary"
          @click="$emit('set-primary', entity)"
          class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Establecer como principal"
        >
          <Star class="w-4 h-4" />
        </button>
        
        <!-- Botón editar -->
        <button 
          @click="$emit('edit', entity)" 
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          title="Editar entidad"
        >
          <Edit class="w-4 h-4" />
        </button>
        
        <!-- Botón eliminar -->
        <button 
          @click="$emit('delete', entity)" 
          class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          :disabled="isOnlyEntity"
          :class="{ 'opacity-50 cursor-not-allowed': isOnlyEntity }"
          :title="isOnlyEntity ? 'No se puede eliminar la única entidad' : 'Eliminar entidad'"
        >
          <Trash class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Edit, Trash, Star } from 'lucide-vue-next'

defineProps({
  entity: {
    type: Object,
    required: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  isOnlyEntity: {
    type: Boolean,
    default: false
  }
})

defineEmits(['edit', 'delete', 'set-primary'])
</script>

<style scoped>
.entity-card {
  @apply transition-all duration-200;
}

.entity-card:hover {
  @apply transform scale-[1.01];
}
</style>
