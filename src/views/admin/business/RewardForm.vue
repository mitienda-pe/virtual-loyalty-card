<template>
  <div class="reward-form">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2>{{ isEditing ? 'Editar Premio' : 'Crear Nuevo Premio' }}</h2>
      <router-link to="/admin/business/rewards" class="btn btn-outline-primary">
        <i class="bi bi-arrow-left"></i> Volver a la lista
      </router-link>
    </div>
    
    <div class="card">
      <div class="card-header bg-primary text-white">
        <h5 class="mb-0">{{ isEditing ? 'Información del Premio' : 'Nuevo Premio' }}</h5>
      </div>
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">{{ isEditing ? 'Cargando información del premio...' : 'Preparando formulario...' }}</p>
        </div>
        
        <form v-else @submit.prevent="saveReward">
          <div class="row">
            <div class="col-md-6">
              <div class="mb-3">
                <label for="rewardName" class="form-label">Nombre del Premio *</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="rewardName" 
                  v-model="reward.name" 
                  required
                  placeholder="Ej: Café Gratis, Descuento 20%, etc."
                >
              </div>
              
              <div class="mb-3">
                <label for="rewardDescription" class="form-label">Descripción</label>
                <textarea 
                  class="form-control" 
                  id="rewardDescription" 
                  v-model="reward.description" 
                  rows="3"
                  placeholder="Describe los detalles del premio"
                ></textarea>
              </div>
              
              <div class="mb-3">
                <label for="rewardPointsCost" class="form-label">Costo en Puntos *</label>
                <input 
                  type="number" 
                  class="form-control" 
                  id="rewardPointsCost" 
                  v-model.number="reward.pointsCost" 
                  min="1" 
                  required
                >
              </div>
              
              <div class="mb-3">
                <label for="rewardLimitPerClient" class="form-label">Límite por Cliente</label>
                <input 
                  type="number" 
                  class="form-control" 
                  id="rewardLimitPerClient" 
                  v-model.number="reward.limitPerClient" 
                  min="0"
                  placeholder="Dejar en blanco para sin límite"
                >
                <div class="form-text">Número máximo de veces que un cliente puede canjear este premio. Dejar en blanco para sin límite.</div>
              </div>
            </div>
            
            <div class="col-md-6">
              <div class="mb-3">
                <label for="rewardValidUntil" class="form-label">Válido Hasta</label>
                <input 
                  type="datetime-local" 
                  class="form-control" 
                  id="rewardValidUntil" 
                  v-model="validUntilFormatted"
                >
                <div class="form-text">Dejar en blanco si el premio no tiene fecha de expiración.</div>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Imagen del Premio</label>
                <div class="input-group mb-3">
                  <input type="file" class="form-control" id="rewardImage" @change="handleImageUpload" accept="image/*">
                  <button class="btn btn-outline-secondary" type="button" @click="clearImage">Limpiar</button>
                </div>
                <div class="form-text">Imagen opcional para mostrar junto al premio. Tamaño recomendado: 500x300px.</div>
              </div>
              
              <div v-if="reward.imageUrl || imagePreview" class="mb-3">
                <label class="form-label">Vista Previa</label>
                <div class="image-preview border rounded p-2">
                  <img 
                    :src="imagePreview || reward.imageUrl" 
                    alt="Vista previa del premio" 
                    class="img-fluid"
                  >
                </div>
              </div>
              
              <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" id="rewardActive" v-model="reward.active">
                <label class="form-check-label" for="rewardActive">Premio Activo</label>
                <div class="form-text">Los premios inactivos no estarán disponibles para canje.</div>
              </div>
            </div>
          </div>
          
          <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
            <router-link to="/admin/business/rewards" class="btn btn-secondary me-md-2">Cancelar</router-link>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ isEditing ? 'Guardar Cambios' : 'Crear Premio' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { 
  doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/firebase';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const reward = ref({
  name: '',
  description: '',
  pointsCost: 100,
  limitPerClient: null,
  validUntil: null,
  imageUrl: '',
  active: true,
  businessId: authStore.businessId
});

const loading = ref(true);
const saving = ref(false);
const imageFile = ref(null);
const imagePreview = ref(null);

const isEditing = computed(() => !!route.params.id);
const rewardId = computed(() => route.params.id);

// Formatear fecha para input datetime-local
const validUntilFormatted = computed({
  get() {
    if (!reward.value.validUntil) return '';
    
    const date = reward.value.validUntil instanceof Timestamp 
      ? reward.value.validUntil.toDate() 
      : new Date(reward.value.validUntil);
    
    return formatDateForInput(date);
  },
  set(value) {
    reward.value.validUntil = value ? new Date(value) : null;
  }
});

onMounted(async () => {
  if (authStore.isAuthenticated && (authStore.isBusinessAdmin || authStore.isSuperAdmin)) {
    if (isEditing.value) {
      await loadReward();
    } else {
      loading.value = false;
    }
  }
});

async function loadReward() {
  try {
    const rewardDoc = await getDoc(doc(db, "rewards", rewardId.value));
    
    if (rewardDoc.exists()) {
      const rewardData = rewardDoc.data();
      
      // Verificar que el premio pertenece al negocio del admin
      if (rewardData.businessId !== authStore.businessId) {
        alert("No tienes permiso para editar este premio.");
        router.push('/admin/business/rewards');
        return;
      }
      
      reward.value = {
        ...rewardData,
        id: rewardId.value
      };
    } else {
      alert("El premio no existe.");
      router.push('/admin/business/rewards');
    }
  } catch (error) {
    console.error("Error al cargar premio:", error);
    alert("Error al cargar premio: " + error.message);
  } finally {
    loading.value = false;
  }
}

async function saveReward() {
  if (!reward.value.name || reward.value.pointsCost < 1) {
    alert("Por favor, completa todos los campos requeridos.");
    return;
  }
  
  saving.value = true;
  
  try {
    let imageUrl = reward.value.imageUrl;
    
    // Si hay una nueva imagen, subirla
    if (imageFile.value) {
      // Si ya había una imagen, eliminarla
      if (reward.value.imageUrl) {
        try {
          const oldImageRef = storageRef(storage, getImagePathFromUrl(reward.value.imageUrl));
          await deleteObject(oldImageRef);
        } catch (error) {
          console.error("Error al eliminar imagen anterior:", error);
        }
      }
      
      // Subir nueva imagen
      const imagePath = `rewards/${authStore.businessId}/${Date.now()}_${imageFile.value.name}`;
      const imageRef = storageRef(storage, imagePath);
      
      await uploadBytes(imageRef, imageFile.value);
      imageUrl = await getDownloadURL(imageRef);
    }
    
    const rewardData = {
      name: reward.value.name,
      description: reward.value.description || '',
      pointsCost: reward.value.pointsCost,
      limitPerClient: reward.value.limitPerClient || null,
      validUntil: reward.value.validUntil ? Timestamp.fromDate(new Date(reward.value.validUntil)) : null,
      imageUrl: imageUrl || '',
      active: reward.value.active,
      businessId: authStore.businessId,
      updatedAt: serverTimestamp()
    };
    
    if (isEditing.value) {
      // Actualizar premio existente
      await updateDoc(doc(db, "rewards", rewardId.value), rewardData);
      alert("Premio actualizado exitosamente.");
    } else {
      // Crear nuevo premio
      rewardData.createdAt = serverTimestamp();
      await addDoc(collection(db, "rewards"), rewardData);
      alert("Premio creado exitosamente.");
    }
    
    router.push('/admin/business/rewards');
  } catch (error) {
    console.error("Error al guardar premio:", error);
    alert("Error al guardar premio: " + error.message);
  } finally {
    saving.value = false;
  }
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validar tipo de archivo
  if (!file.type.match('image.*')) {
    alert("Por favor, selecciona una imagen.");
    return;
  }
  
  // Validar tamaño (máximo 2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert("La imagen es demasiado grande. El tamaño máximo es 2MB.");
    return;
  }
  
  imageFile.value = file;
  
  // Crear vista previa
  const reader = new FileReader();
  reader.onload = e => {
    imagePreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  imageFile.value = null;
  imagePreview.value = null;
  
  // Si estamos editando, no eliminar la URL de la imagen existente
  // Solo se eliminará si se guarda el formulario
}

function getImagePathFromUrl(url) {
  // Extraer la ruta de la imagen de la URL de Firebase Storage
  const baseUrl = "https://firebasestorage.googleapis.com/v0/b/";
  const path = url.substring(url.indexOf(baseUrl) + baseUrl.length);
  const pathParts = path.split(/[?#]/)[0].split('/');
  
  // Eliminar el bucket y "o/" del path
  pathParts.shift();
  pathParts.shift();
  
  return decodeURIComponent(pathParts.join('/'));
}

function formatDateForInput(date) {
  if (!date) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
</script>

<style scoped>
.reward-form {
  padding-bottom: 2rem;
}

.image-preview {
  max-height: 200px;
  overflow: hidden;
}

.image-preview img {
  max-height: 180px;
  object-fit: contain;
  margin: 0 auto;
  display: block;
}
</style>
