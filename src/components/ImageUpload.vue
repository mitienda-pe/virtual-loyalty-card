<!-- src/components/ImageUpload.vue -->
<template>
    <div :class="className">
        <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ label }}
        </label>

        <div class="relative border-2 border-dashed rounded-lg p-4 text-center" :class="{
            'border-blue-500 bg-blue-50': dragActive,
            'border-gray-300 hover:border-gray-400': !dragActive,
            'border-red-500': error
        }" @dragenter.prevent="handleDrag" @dragleave.prevent="handleDrag" @dragover.prevent="handleDrag"
            @drop.prevent="handleDrop">
            <div v-if="preview" class="relative">
                <img :src="preview" :alt="label" class="max-h-32 mx-auto rounded" />
                <button @click.prevent="handleRemove"
                    class="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600">
                    <XIcon class="w-4 h-4" />
                </button>
            </div>
            <div v-else class="space-y-2">
                <UploadIcon class="mx-auto h-8 w-8 text-gray-400" />
                <div class="text-sm text-gray-600">
                    Arrastra una imagen o haz click para seleccionar
                </div>
            </div>

            <input type="file" :accept="accept" @change="handleChange"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>

        <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { Upload as UploadIcon, X as XIcon } from 'lucide-vue-next';

const props = defineProps({
    label: {
        type: String,
        required: true
    },
    preview: {
        type: String,
        default: ''
    },
    error: {
        type: String,
        default: ''
    },
    accept: {
        type: String,
        default: 'image/*'
    },
    className: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['change']);

const dragActive = ref(false);

const handleDrag = (e) => {
    if (e.type === "dragenter" || e.type === "dragover") {
        dragActive.value = true;
    } else if (e.type === "dragleave") {
        dragActive.value = false;
    }
};

const handleDrop = (e) => {
    dragActive.value = false;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        emit('change', e.dataTransfer.files[0]);
    }
};

const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
        emit('change', e.target.files[0]);
    }
};

const handleRemove = () => {
    emit('change', null);
};
</script>