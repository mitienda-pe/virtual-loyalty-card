<!-- src/views/admin/BusinessList.vue -->
<template>
    <div class="px-4 sm:px-6 lg:px-8">
        <div class="sm:flex sm:items-center">
            <div class="sm:flex-auto">
                <h1 class="text-2xl font-semibold text-gray-900">Negocios</h1>
                <p class="mt-2 text-sm text-gray-700">
                    Lista de todos los negocios registrados en la plataforma.
                </p>
            </div>
            <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                <router-link to="/admin/businesses/new"
                    class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    Agregar negocio
                </router-link>
            </div>
        </div>

        <div class="mt-8 flex flex-col">
            <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                    <div v-if="loading" class="animate-pulse space-y-4">
                        <div v-for="i in 3" :key="i" class="h-16 bg-gray-200 rounded"></div>
                    </div>

                    <div v-else class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table class="min-w-full divide-y divide-gray-300">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Nombre
                                    </th>
                                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        RUC
                                    </th>
                                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Ciudad
                                    </th>
                                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Teléfono
                                    </th>
                                    <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                        <span class="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 bg-white">
                                <tr v-for="business in businesses" :key="business.id">
                                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                                        {{ business.name }}
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {{ business.ruc }}
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {{ business.city }}
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {{ business.phone }}
                                    </td>
                                    <td
                                        class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                        <router-link :to="`/admin/businesses/${business.id}/edit`"
                                            class="text-blue-600 hover:text-blue-900 mr-4">
                                            Editar
                                        </router-link>
                                        <button @click="deleteBusiness(business)"
                                            class="text-red-600 hover:text-red-900">
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

const businesses = ref([]);
const loading = ref(true);

async function loadBusinesses() {
    const querySnapshot = await getDocs(collection(db, 'businesses'));
    businesses.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    loading.value = false;
}

async function deleteBusiness(business) {
    if (!confirm(`¿Estás seguro de eliminar ${business.name}?`)) return;

    try {
        await deleteDoc(doc(db, 'businesses', business.id));
        businesses.value = businesses.value.filter(b => b.id !== business.id);
    } catch (error) {
        console.error('Error al eliminar negocio:', error);
        alert('Error al eliminar el negocio');
    }
}

onMounted(loadBusinesses);
</script>