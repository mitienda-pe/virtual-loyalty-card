<!-- src/views/admin/AdminLayout.vue -->
<template>
    <div class="min-h-screen bg-gray-100">
        <!-- Navigation -->
        <nav class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex">
                        <!-- Logo -->
                        <div class="flex-shrink-0 flex items-center">
                            <router-link to="/" class="text-xl font-bold text-gray-800">
                                Loyalty Card
                            </router-link>
                        </div>

                        <!-- Navigation Links -->
                        <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <router-link to="/admin" class="inline-flex items-center px-1 pt-1 border-b-2" :class="[
                                $route.path === '/admin'
                                    ? 'border-blue-500 text-gray-900'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            ]">
                                Dashboard
                            </router-link>

                            <router-link v-if="authStore.isSuperAdmin" to="/admin/businesses"
                                class="inline-flex items-center px-1 pt-1 border-b-2" :class="[
                                    $route.path.startsWith('/admin/businesses')
                                        ? 'border-blue-500 text-gray-900'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                ]">
                                Negocios
                            </router-link>
                        </div>
                    </div>

                    <!-- Right side -->
                    <div class="flex items-center">
                        <div class="flex items-center space-x-3">
                            <span class="text-sm text-gray-500">{{ authStore.user?.email }}</span>
                            <button @click="handleLogout"
                                class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100">
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <router-view />
            </div>
        </div>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

async function handleLogout() {
    try {
        await authStore.signOut();
        router.push('/login');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}
</script>