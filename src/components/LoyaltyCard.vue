<!-- src/components/LoyaltyCard.vue -->
<template>
    <div class="flex flex-col items-center"
        :style="{ backgroundColor: business?.config?.backgroundColor || '#ffffff' }">
        <!-- Loading State -->
        <div v-if="loading" class="w-full max-w-md mx-auto p-8 bg-white shadow-lg rounded-xl">
            <div class="animate-pulse flex flex-col items-center">
                <div class="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div class="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="w-full max-w-md mx-auto bg-white shadow-lg rounded-xl">
            <div class="p-6 text-center">
                <ShieldAlert class="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Error</h2>
                <p class="text-gray-600">{{ error }}</p>
            </div>
        </div>

        <!-- Main Card Content -->
        <div v-else-if="business" class="w-full max-w-md mx-auto bg-white shadow-lg rounded-xl overflow-hidden">
            <!-- Cover Image -->
            <div class="relative h-48 bg-gradient-to-r from-rose-100 to-teal-100">
                <img :src="business.cover" :alt="`${business.name} Cover`" class="w-full h-full object-cover" />

                <!-- Profile Picture Overlay -->
                <div class="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                    <div class="relative">
                        <div class="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-lg">
                            <img :src="business.logo" :alt="`${business.name} Logo`"
                                class="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Business Info -->
            <div class="mt-20 px-6 text-center">
                <h1 class="text-3xl font-bold text-gray-900">{{ business.name }}</h1>
                <p class="text-gray-600 mt-2">{{ business.description }}</p>
                <h2 class="text-lg text-gray-600 mt-4">
                    Tarjeta de Cliente Frecuente perteneciente a
                </h2>
                <p class="text-gray-800 font-semibold mt-1">{{ phone }}</p>
            </div>

            <!-- Loyalty Card Grid -->
            <div class="p-6">
                <div class="grid grid-cols-5 gap-4">
                    <div v-for="(_, index) in purchasesRequired" :key="index" :class="[
                        'aspect-square rounded-lg flex items-center justify-center border-2 p-2',
                        index < purchaseCount
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                    ]">
                        <Check v-if="index < purchaseCount" class="w-8 h-8 text-green-500" />
                        <component :is="selectedIcon" v-else class="w-8 h-8 text-gray-300" />
                    </div>
                </div>

                <!-- Progress Info -->
                <div class="mt-6 text-center">
                    <p class="text-lg font-semibold text-gray-700">
                        {{ purchaseCount }} de {{ purchasesRequired }} compras
                    </p>
                    <div v-if="purchaseCount >= purchasesRequired"
                        class="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
                        <p class="font-medium">¡Felicidades! Has completado tu tarjeta</p>
                        <p class="mt-1 text-sm">Premio: {{ business.config.reward }}</p>
                    </div>
                    <p v-else class="text-sm text-gray-500 mt-2">
                        Te faltan {{ purchasesRequired - purchaseCount }} compras para completar tu tarjeta
                    </p>

                    <!-- Business Details -->
                    <div class="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                        <p class="text-gray-600"><strong>Dirección:</strong> {{ business.address }}</p>
                        <p class="text-gray-600 mt-1"><strong>Teléfono:</strong> {{ business.phone }}</p>
                    </div>

                    <!-- Recent Purchases -->
                    <div class="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                        <h3 class="font-semibold text-gray-700 mb-2">Últimas compras</h3>
                        <div v-if="recentPurchases.length > 0">
                            <div v-for="purchase in recentPurchases" :key="purchase.date"
                                class="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                <span class="text-gray-600">
                                    {{ formatDate(purchase.date) }}
                                </span>
                                <span class="font-medium">
                                    S/ {{ purchase.amount.toFixed(2) }}
                                </span>
                            </div>
                        </div>
                        <p v-else class="text-gray-500 text-sm">
                            Aún no hay compras registradas
                        </p>
                    </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import {
    collection,
    doc,
    getDoc,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import {
    Check,
    ShieldAlert,
    Wine,
    Coffee,
    Beer,
    Heart,
    Candy,
    Fuel,
    Cookie,
    Apple,
    Dog,
    Pizza,
    GlassWater,
    Drama,
    Scissors,
    Utensils,
} from 'lucide-vue-next';
import { db } from '@/firebase';

const iconMap = {
    wine: Wine,
    cafe: Coffee,
    beer: Beer,
    heart: Heart,
    candy: Candy,
    fuel: Fuel,
    cookie: Cookie,
    apple: Apple,
    dog: Dog,
    pizza: Pizza,
    soda: GlassWater,
    drama: Drama,
    scissors: Scissors,
    utensils: Utensils,
};

const route = useRoute();
const phone = ref(route.params.phone);
const businessSlug = ref(route.params.businessSlug);
const business = ref(null);
const customerData = ref(null);
const loading = ref(true);
const error = ref(null);

// Computed properties
const selectedIcon = computed(() => {
    return iconMap[business.value?.config?.icon || 'cafe'];
});

const purchaseCount = computed(() => {
    return customerData.value?.businesses?.[businessSlug.value]?.purchaseCount || 0;
});

const purchasesRequired = computed(() => {
    return business.value?.config?.purchasesRequired || 10;
});

const recentPurchases = computed(() => {
    const purchases = customerData.value?.businesses?.[businessSlug.value]?.purchases || [];
    return [...purchases]
        .sort((a, b) => b.date.toMillis() - a.date.toMillis())
        .slice(0, 5);
});

// Helpers
const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate();
    return d.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

// Data loading functions
const loadBusinessData = async () => {
    const businessDoc = await getDoc(doc(db, 'businesses', businessSlug.value));

    if (!businessDoc.exists()) {
        throw new Error('Negocio no encontrado');
    }

    business.value = {
        id: businessDoc.id,
        ...businessDoc.data()
    };
};

const loadCustomerData = async () => {
    const customerDoc = await getDoc(doc(db, 'customers', phone.value));

    if (!customerDoc.exists()) {
        customerData.value = null;
        return;
    }

    customerData.value = customerDoc.data();
};

// Validation function
const validatePhoneNumber = (phone) => {
    return phone.match(/^\+[0-9]{11,}$/);
};

// Page title update
const updateTitle = () => {
    if (business.value && phone.value) {
        document.title = `${business.value.name} - Tarjeta de Cliente Frecuente - ${phone.value}`;
    }
};

// Lifecycle hooks
onMounted(async () => {
    try {
        if (!validatePhoneNumber(phone.value)) {
            throw new Error('Número de teléfono inválido');
        }

        await loadBusinessData();
        await loadCustomerData();
        updateTitle();
    } catch (err) {
        console.error('Error:', err);
        error.value = err.message || 'Error al cargar la tarjeta de fidelización';
    } finally {
        loading.value = false;
    }
});

onUnmounted(() => {
    document.title = 'Loyalty Card';
});
</script>