<!-- src/views/admin/business/BusinessSettings.vue -->
<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <BusinessForm :isBusinessAdmin="true" :businessSlug="businessSlug" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import BusinessForm from '@/views/admin/BusinessForm.vue';

const authStore = useAuthStore();
const businessSlug = computed(() => authStore.businessId);
</script>
