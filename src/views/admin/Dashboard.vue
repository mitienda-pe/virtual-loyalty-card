<!-- src/views/admin/Dashboard.vue -->
<template>
    <div>
        <h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1>

        <!-- Super Admin Dashboard -->
        <div v-if="authStore.isSuperAdmin" class="mt-6">
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <!-- Total Businesses Card -->
                <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="p-5">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <Store class="h-6 w-6 text-gray-400" />
                            </div>
                            <div class="ml-5 w-0 flex-1">
                                <dl>
                                    <dt class="text-sm font-medium text-gray-500 truncate">
                                        Total de Negocios
                                    </dt>
                                    <dd class="flex items-baseline">
                                        <div class="text-2xl font-semibold text-gray-900">
                                            {{ stats.totalBusinesses }}
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Total Customers Card -->
                <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="p-5">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <Users2 class="h-6 w-6 text-gray-400" />
                            </div>
                            <div class="ml-5 w-0 flex-1">
                                <dl>
                                    <dt class="text-sm font-medium text-gray-500 truncate">
                                        Total de Clientes
                                    </dt>
                                    <dd class="flex items-baseline">
                                        <div class="text-2xl font-semibold text-gray-900">
                                            {{ stats.totalCustomers }}
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Total Purchases Card -->
                <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="p-5">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <ReceiptText class="h-6 w-6 text-gray-400" />
                            </div>
                            <div class="ml-5 w-0 flex-1">
                                <dl>
                                    <dt class="text-sm font-medium text-gray-500 truncate">
                                        Total de Compras
                                    </dt>
                                    <dd class="flex items-baseline">
                                        <div class="text-2xl font-semibold text-gray-900">
                                            {{ stats.totalPurchases }}
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Rest of the template remains the same -->

    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { Store, Users2, ReceiptText } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { db } from '@/firebase';

const authStore = useAuthStore();
const business = ref(null);
const stats = ref({
    totalBusinesses: 0,
    totalCustomers: 0,
    totalPurchases: 0,
    activeCustomers: 0,
    monthlyPurchases: 0,
    completedCards: 0,
    rewardsGiven: 0
});

async function loadSuperAdminStats() {
    const [businessesSnap, customersSnap] = await Promise.all([
        getDocs(collection(db, 'businesses')),
        getDocs(collection(db, 'customers'))
    ]);

    stats.value.totalBusinesses = businessesSnap.size;
    stats.value.totalCustomers = customersSnap.size;

    let totalPurchases = 0;
    customersSnap.forEach(doc => {
        const data = doc.data();
        Object.values(data.businesses || {}).forEach(business => {
            totalPurchases += business.purchases?.length || 0;
        });
    });
    stats.value.totalPurchases = totalPurchases;
}

async function loadBusinessStats() {
    if (!authStore.businessId) return;

    // Cargar información del negocio
    const businessDoc = await getDoc(doc(db, 'businesses', authStore.businessId));
    if (businessDoc.exists()) {
        business.value = {
            id: businessDoc.id,
            ...businessDoc.data()
        };
    }

    // Cargar estadísticas
    const customerQuery = query(
        collection(db, 'customers'),
        where(`businesses.${authStore.businessId}.purchaseCount`, '>', 0)
    );
    const customersSnap = await getDocs(customerQuery);

    let activeCount = 0;
    let completedCount = 0;
    let monthlyPurchases = 0;
    let rewardsCount = 0;

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    customersSnap.forEach(doc => {
        const data = doc.data();
        const businessData = data.businesses[authStore.businessId];

        if (businessData.lastVisit?.toDate() > oneMonthAgo) {
            activeCount++;
        }

        if (businessData.purchaseCount >= (business.value?.config?.purchasesRequired || 10)) {
            completedCount++;
        }

        businessData.purchases?.forEach(purchase => {
            if (purchase.date?.toDate() > oneMonthAgo) {
                monthlyPurchases++;
            }
        });
    });

    stats.value = {
        ...stats.value,
        activeCustomers: activeCount,
        monthlyPurchases,
        completedCards: completedCount,
        rewardsGiven: completedCount // Asumimos que cada tarjeta completada = 1 premio
    };
}

onMounted(async () => {
    if (authStore.isSuperAdmin) {
        await loadSuperAdminStats();
    } else if (authStore.isAdmin) {
        await loadBusinessStats();
    }
});
</script>