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
                            <div v-for="purchase in recentPurchases" :key="purchase.timestamp"
                                class="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                <span class="text-gray-600">
                                    {{ formatDate(purchase.timestamp) }}
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
    
    // Crear una copia segura de los datos
    const safePurchases = [...purchases].map(purchase => {
        // Asegurarse de que cada compra tenga un campo timestamp válido
        // Si no tiene timestamp pero tiene date (compatibilidad con versiones anteriores)
        if (!purchase.timestamp && purchase.date) {
            return {
                ...purchase,
                timestamp: purchase.date
            };
        }
        return purchase;
    });
    
    // Ordenar por fecha (de más reciente a más antigua)
    return safePurchases.sort((a, b) => {
        // Obtener timestamps en milisegundos para comparación
        const getTimeInMillis = (purchase) => {
            // Caso 1: Timestamp de Firestore (tiene toMillis)
            if (purchase.timestamp?.toMillis) {
                return purchase.timestamp.toMillis();
            }
            // Caso 2: Objeto Date de JavaScript
            else if (purchase.timestamp instanceof Date) {
                return purchase.timestamp.getTime();
            }
            // Caso 3: Compatibilidad con campo date anterior
            else if (purchase.date?.toMillis) {
                return purchase.date.toMillis();
            }
            // Caso 4: Date como objeto JavaScript
            else if (purchase.date instanceof Date) {
                return purchase.date.getTime();
            }
            // Caso 5: Valor numérico (timestamp en milisegundos)
            else if (typeof purchase.timestamp === 'number') {
                return purchase.timestamp;
            }
            // Caso 6: No hay fecha válida
            return 0;
        };
        
        const aTime = getTimeInMillis(a);
        const bTime = getTimeInMillis(b);
        
        // Ordenar de más reciente a más antiguo
        return bTime - aTime;
    })
    .slice(0, 5); // Mostrar solo las 5 compras más recientes
});

// Helpers
const formatDate = (date) => {
    if (!date) return '';
    
    try {
        // Manejar diferentes tipos de objetos de fecha
        let d;
        
        // Si es un objeto Firestore Timestamp (tiene toDate)
        if (date.toDate) {
            d = date.toDate();
        }
        // Si ya es un objeto Date de JavaScript
        else if (date instanceof Date) {
            d = date;
        }
        // Si es un número (timestamp en milisegundos)
        else if (typeof date === 'number') {
            d = new Date(date);
        }
        // Si es un string con formato ISO
        else if (typeof date === 'string' && date.match(/\d{4}-\d{2}-\d{2}/)) {
            d = new Date(date);
        }
        // Si no podemos determinar el tipo, intentar convertir directamente
        else {
            console.warn('Intentando convertir formato de fecha desconocido:', date);
            d = new Date(date);
            
            // Verificar si la fecha es válida
            if (isNaN(d.getTime())) {
                console.error('No se pudo convertir a fecha válida:', date);
                return '';
            }
        }
        
        return d.toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error al formatear fecha:', error, date);
        return '';
    }
};

// Data loading functions
const loadBusinessData = async () => {
    console.log('Cargando datos del negocio con slug:', businessSlug.value);
    try {
        const businessDoc = await getDoc(doc(db, 'businesses', businessSlug.value));
        console.log('Respuesta de Firestore para el negocio:', businessDoc);
        console.log('¿El documento existe?', businessDoc.exists());
        
        if (!businessDoc.exists()) {
            console.error('Negocio no encontrado en Firestore:', businessSlug.value);
            throw new Error('Negocio no encontrado');
        }
        
        business.value = {
            id: businessDoc.id,
            ...businessDoc.data()
        };
        console.log('Datos del negocio cargados correctamente:', business.value);
    } catch (err) {
        console.error('Error al cargar datos del negocio:', err);
        throw err;
    }
};

const loadCustomerData = async () => {
    console.log('Cargando datos del cliente con teléfono:', phone.value);
    try {
        const customerDoc = await getDoc(doc(db, 'customers', phone.value));
        console.log('¿El documento del cliente existe?', customerDoc.exists());
        
        if (!customerDoc.exists()) {
            console.log('Cliente no encontrado, se creará un nuevo registro si es necesario');
            customerData.value = null;
            return;
        }
        
        customerData.value = customerDoc.data();
        console.log('Datos del cliente cargados:', customerData.value);
    } catch (err) {
        console.error('Error al cargar datos del cliente:', err);
        // No lanzamos error aquí para permitir clientes nuevos
    }
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
    console.log('Componente LoyaltyCard montado');
    console.log('Parámetros de ruta:', route.params);
    console.log('Business slug:', businessSlug.value);
    console.log('Teléfono:', phone.value);
    
    try {
        if (!validatePhoneNumber(phone.value)) {
            console.error('Número de teléfono inválido:', phone.value);
            throw new Error('Número de teléfono inválido');
        }

        console.log('Iniciando carga de datos del negocio...');
        await loadBusinessData();
        console.log('Iniciando carga de datos del cliente...');
        await loadCustomerData();
        updateTitle();
    } catch (err) {
        console.error('Error en el montaje del componente:', err);
        error.value = err.message || 'Error al cargar la tarjeta de fidelización';
    } finally {
        loading.value = false;
        console.log('Estado final de carga:', { error: error.value, loading: loading.value });
    }
});

onUnmounted(() => {
    document.title = 'Loyalty Card';
});
</script>