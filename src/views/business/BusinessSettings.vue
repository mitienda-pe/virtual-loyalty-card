<template>
  <BusinessForm :businessSlug="businessSlug" :isBusinessOwner="true" />
</template>

<script setup>
import { ref, computed } from 'vue';
import BusinessForm from '@/views/admin/BusinessForm.vue';
import { useAuth } from '@/composables/useAuth';

const { currentUser } = useAuth();
const businessSlug = computed(() => currentUser.value?.businessSlug || null);
</script>

<style scoped>
</style>
