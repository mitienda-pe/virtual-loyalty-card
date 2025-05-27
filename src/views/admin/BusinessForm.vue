<!-- src/views/admin/BusinessForm.vue -->
<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-gray-900">
        {{ isEdit ? 'Editar negocio' : 'Nuevo negocio' }}
      </h1>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Información básica -->
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
            Información básica
          </h3>
          <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="name" class="block text-sm font-medium text-gray-700">
                Nombre comercial
              </label>
              <input type="text" id="name" v-model="form.name" required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div class="sm:col-span-2">
              <label for="businessName" class="block text-sm font-medium text-gray-700">
                Razón social
              </label>
              <input type="text" id="businessName" v-model="form.businessName" required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label for="slug" class="block text-sm font-medium text-gray-700">
                Slug (URL)
              </label>
              <input type="text" id="slug" v-model="form.slug" required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label for="ruc" class="block text-sm font-medium text-gray-700">
                RUC
              </label>
              <input type="text" id="ruc" v-model="form.ruc" required maxlength="11"
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div class="sm:col-span-2">
              <label for="description" class="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea id="description" v-model="form.description" rows="3"
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Imágenes -->
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
            Imágenes
          </h3>
          <div class="grid grid-cols-1 gap-y-6 sm:grid-cols-2 gap-x-4">
            <ImageUpload label="Logo del negocio" :preview="logoPreview" :error="logoError"
              @change="handleLogoChange" />
            <ImageUpload label="Imagen de portada" :preview="coverPreview" :error="coverError"
              @change="handleCoverChange" />
          </div>
        </div>
      </div>

      <!-- Configuración de la tarjeta -->
      <!-- Encabezado del programa de lealtad -->
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div class="flex items-center">
          <span class="text-2xl mr-2">🎁</span>
          <h2 class="text-xl font-bold text-yellow-800">Programa de Lealtad</h2>
        </div>
        <p class="mt-2 text-yellow-700">Configura aquí los escalones y premios que tus clientes pueden alcanzar por sus compras.</p>
      </div>
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
            Configuración de la tarjeta de fidelización
          </h3>

          <!-- Icono y color -->
          <div class="mb-6">
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Icono y color de fondo
              </label>
              <div class="flex space-x-4 items-center mb-4">
                <input type="color" v-model="form.config.backgroundColor" class="h-10 w-20" />
                <span class="text-sm text-gray-600">Color de fondo</span>
              </div>
              <IconPicker v-model="form.config.icon" />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label for="purchasesRequired" class="block text-sm font-medium text-gray-700">
                Compras requeridas
              </label>
              <input type="number" id="purchasesRequired" v-model="form.config.purchasesRequired" required
                min="1"
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label for="minAmount" class="block text-sm font-medium text-gray-700">
                Monto mínimo por consumo
              </label>
              <input type="number" id="minAmount" v-model="form.config.minAmount" min="0" step="0.01"
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>

          <!-- Premios escalonados -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Premios escalonados
            </label>
            <div v-for="(reward, idx) in form.config.rewards" :key="idx" class="flex items-center space-x-2 mb-2">
              <input type="number" v-model.number="reward.consumptions" min="1" placeholder="Consumos" class="w-24 border rounded px-2 py-1" />
              <input type="text" v-model="reward.reward" placeholder="Descripción del premio" class="flex-1 border rounded px-2 py-1" />
              <button type="button" @click="form.config.rewards.splice(idx, 1)" class="text-red-500 hover:text-red-700">Eliminar</button>
            </div>
            <button type="button" @click="form.config.rewards.push({ consumptions: '', reward: '' })" class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded">Añadir premio</button>
          </div>

          <div>
            <label for="timeLimit" class="block text-sm font-medium text-gray-700">
              Tiempo mínimo entre compras (minutos)
            </label>
            <input type="number" id="timeLimit" v-model="form.config.timeLimit" required min="0"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div>
            <label for="expirationDays" class="block text-sm font-medium text-gray-700">
              Días de validez de las compras
            </label>
            <input type="number" id="expirationDays" v-model="form.config.expirationDays" required
              min="1"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div class="sm:col-span-2">
            <label for="reward" class="block text-sm font-medium text-gray-700">
              Premio
            </label>
            <input type="text" id="reward" v-model="form.config.reward" required
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      </div>

      <!-- Información de contacto -->
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
            Información de contacto
          </h3>
          <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label for="address" class="block text-sm font-medium text-gray-700">
                Dirección
              </label>
              <input type="text" id="address" v-model="form.address" required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label for="city" class="block text-sm font-medium text-gray-700">
                Ciudad
              </label>
              <input type="text" id="city" v-model="form.city" required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label for="phone" class="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input type="text" id="phone" v-model="form.phone" required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-3">
        <router-link :to="props.businessSlug ? '/admin/business/dashboard' : '/admin/businesses'"
          class="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          Cancelar
        </router-link>
        <button type="submit" :disabled="loading"
          class="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
          {{ loading ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';
import ImageUpload from '@/components/ImageUpload.vue';
import IconPicker from '@/components/IconPicker.vue';

const props = defineProps({
  businessSlug: {
    type: String,
    default: null
  },
  isBusinessAdmin: {
    type: Boolean,
    default: false
  }
});

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const logoError = ref('');
const coverError = ref('');
const logoPreview = ref('');
const coverPreview = ref('');
const logoFile = ref(null);
const coverFile = ref(null);

const isEdit = computed(() => !!props.businessSlug || route.params.id !== undefined);

const form = ref({
    name: '',
    businessName: '',
    slug: '',
    ruc: '',
    description: '',
    address: '',
    city: '',
    phone: '',
    logo: '',
    cover: '',
    config: {
        purchasesRequired: 10,
        timeLimit: 60,
        expirationDays: 90,
        icon: 'cafe',
        backgroundColor: '#ffffff',
        reward: '',
        minAmount: 0,
        rewards: [],
    }
});

const handleLogoChange = (file) => {
    logoError.value = '';
    logoFile.value = file;

    if (file) {
        logoPreview.value = URL.createObjectURL(file);
    } else {
        logoPreview.value = form.value.logo;
    }
};

const handleCoverChange = (file) => {
    coverError.value = '';
    coverFile.value = file;

    if (file) {
        coverPreview.value = URL.createObjectURL(file);
    } else {
        coverPreview.value = form.value.cover;
    }
};

const uploadImage = async (file, path) => {
    if (!file) return null;

    const fileRef = storageRef(storage, `businesses/${path}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
};

const loadBusiness = async () => {
    // Usar businessSlug (prop) si está presente, si no usar route.params.id
    const businessId = props.businessSlug || route.params.id;
    if (!businessId) return;

    loading.value = true;
    try {
        const docRef = doc(db, 'businesses', businessId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            form.value = {
                ...docSnap.data(),
                config: {
                    purchasesRequired: docSnap.data().config?.purchasesRequired || 10,
                    timeLimit: docSnap.data().config?.timeLimit || 60,
                    expirationDays: docSnap.data().config?.expirationDays || 90,
                    icon: docSnap.data().config?.icon || 'cafe',
                    backgroundColor: docSnap.data().config?.backgroundColor || '#ffffff',
                    reward: docSnap.data().config?.reward || '',
                    minAmount: docSnap.data().config?.minAmount || 0,
                    rewards: docSnap.data().config?.rewards || []
                }
            };
            logoPreview.value = docSnap.data().logo;
            coverPreview.value = docSnap.data().cover;
        }
    } catch (error) {
        console.error('Error al cargar negocio:', error);
        alert('Error al cargar los datos del negocio');
    } finally {
        loading.value = false;
    }
};

const handleSubmit = async () => {
    loading.value = true;
    try {
        // Subir imágenes si han sido cambiadas
        if (logoFile.value) {
            form.value.logo = await uploadImage(logoFile.value, `${form.value.slug}/logo`);
        }
        if (coverFile.value) {
            form.value.cover = await uploadImage(coverFile.value, `${form.value.slug}/cover`);
        }

        if (isEdit.value) {
            await updateDoc(doc(db, 'businesses', route.params.id), form.value);
        } else {
            await setDoc(doc(db, 'businesses', form.value.slug), form.value);
        }
        router.push('/admin/businesses');
    } catch (error) {
        console.error('Error al guardar negocio:', error);
        alert('Error al guardar el negocio');
    } finally {
        loading.value = false;
    }
};

onMounted(loadBusiness);
</script>