<!-- src/components/IconPicker.vue -->
<template>
    <div class="grid grid-cols-7 gap-2">
        <button v-for="{ id, icon: Icon, label } in icons" :key="id" type="button"
            @click="$emit('update:modelValue', id)" class="p-2 rounded-lg flex flex-col items-center gap-1"
            :class="modelValue === id ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'" :title="label">
            <component :is="Icon" class="w-6 h-6" :class="modelValue === id ? 'text-blue-500' : 'text-gray-600'"
                :style="modelValue === id ? { color } : undefined" />
            <span class="text-xs text-gray-600">{{ label }}</span>
        </button>
    </div>
</template>

<script setup>
import {
    Wine,
    Beer,
    GlassWater,
    Coffee,
    Utensils,
    Cookie,
    Dog,
    Heart,
    Apple,
    Scissors,
    Drama,
    Fuel,
    Pizza,
    Candy,
} from 'lucide-vue-next';

const props = defineProps({
    modelValue: {
        type: String,
        required: true
    },
    color: {
        type: String,
        default: '#000000'
    }
});

defineEmits(['update:modelValue']);

const icons = [
    { id: 'wine', icon: Wine, label: 'Botella' },
    { id: 'cafe', icon: Coffee, label: 'Café' },
    { id: 'beer', icon: Beer, label: 'Cerveza' },
    { id: 'heart', icon: Heart, label: 'Corazón' },
    { id: 'candy', icon: Candy, label: 'Dulce' },
    { id: 'fuel', icon: Fuel, label: 'Combustible' },
    { id: 'cookie', icon: Cookie, label: 'Galleta' },
    { id: 'apple', icon: Apple, label: 'Manzana' },
    { id: 'dog', icon: Dog, label: 'Mascota' },
    { id: 'pizza', icon: Pizza, label: 'Pizza' },
    { id: 'soda', icon: GlassWater, label: 'Refresco' },
    { id: 'drama', icon: Drama, label: 'Teatro' },
    { id: 'scissors', icon: Scissors, label: 'Tijeras' },
    { id: 'utensils', icon: Utensils, label: 'Tenedores' },
];
</script>