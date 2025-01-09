<!-- LoyaltyCard.vue -->
<template>
    <div class="flex flex-col items-center">
        <div v-if="loading" class="w-full max-w-md mx-auto p-8 bg-white shadow-lg rounded-xl">
            <div class="animate-pulse flex flex-col items-center">
                <div class="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div class="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        </div>

        <div v-else-if="error" class="w-full max-w-md mx-auto bg-white shadow-lg rounded-xl">
            <div class="p-6 text-center">
                <ShieldAlert class="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Error de Seguridad</h2>
                <p class="text-gray-600">{{ error }}</p>
            </div>
        </div>

        <div v-else class="w-full max-w-md mx-auto bg-white shadow-lg rounded-xl overflow-hidden">
            <!-- Cover Image -->
            <div class="relative h-48 bg-gradient-to-r from-rose-100 to-teal-100">
                <img :src="coverImage" alt="La Parisien Cover" class="w-full h-full object-cover" />

                <!-- Profile Picture Overlay -->
                <div class="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                    <div class="relative">
                        <div class="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-lg">
                            <img :src="logoImage" alt="La Parisien Logo" class="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Business Info -->
            <div class="mt-20 px-6 text-center">
                <h1 class="text-3xl font-bold text-gray-900">La Parisien</h1>
                <h2 class="text-lg text-gray-600 mt-4">
                    Tarjeta de Cliente Frecuente perteneciente a
                </h2>
                <p class="text-gray-800 font-semibold mt-1">{{ phone }}</p>
            </div>

            <!-- Loyalty Card Grid -->
            <div class="p-6">
                <div class="grid grid-cols-5 gap-4">
                    <div v-for="(_, index) in 10" :key="index" :class="[
                        'aspect-square rounded-lg flex items-center justify-center border-2 p-2',
                        index < purchaseCount
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                    ]">
                        <Check v-if="index < purchaseCount" class="w-8 h-8 text-green-500" />
                        <Coffee v-else class="w-8 h-8 text-gray-300" />
                    </div>
                </div>

                <div class="mt-6 text-center">
                    <p class="text-lg font-semibold text-gray-700">
                        {{ purchaseCount }} de 10 compras
                    </p>
                    <div v-if="purchaseCount === 10" class="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
                        ¡Felicidades! Has completado tu tarjeta
                    </div>
                    <p v-else class="text-sm text-gray-500 mt-2">
                        Te faltan {{ 10 - purchaseCount }} compras para completar tu tarjeta
                    </p>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="mt-6 mb-8 text-center text-gray-500 text-sm">
            Powered by Tiendas Virtuales Latinoamérica SAC
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Check, Coffee, ShieldAlert } from 'lucide-vue-next'
import { db } from '@/firebase'

import coverImage from '@/assets/images/cover.jpg'
import logoImage from '@/assets/images/logo.png'

const route = useRoute()
const router = useRouter()
const phone = ref(route.params.phone)
const purchases = ref([])
const loading = ref(true)
const error = ref(null)

const purchaseCount = computed(() => purchases.value.length)

// Update page title
const updateTitle = () => {
    if (phone.value) {
        document.title = `La Parisien - Tarjeta de Cliente Frecuente - ${phone.value}`
    }
}

onMounted(async () => {
    try {
        updateTitle()
        if (!phone.value?.match(/^\+[0-9]{11,}$/)) {
            throw new Error('Número de teléfono inválido')
        }

        const purchasesRef = collection(db, 'purchases')
        const q = query(purchasesRef, where('phoneNumber', '==', phone.value))
        const querySnapshot = await getDocs(q)

        purchases.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
    } catch (err) {
        console.error('Error:', err)
        error.value = 'Error al cargar la tarjeta de fidelización'
    } finally {
        loading.value = false
    }
})

onUnmounted(() => {
    document.title = 'La Parisien'
})
</script>