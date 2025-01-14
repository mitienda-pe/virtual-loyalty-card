<!-- src/views/Checkout.vue -->
<template>
    <div class="min-h-screen bg-gray-50 py-12">
        <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900">Contratar Plan Anual</h1>
                <p class="mt-2 text-gray-600">Complete los datos de su empresa para comenzar</p>
            </div>

            <!-- Stepper -->
            <div class="mb-8">
                <div class="flex items-center justify-center space-x-4">
                    <div v-for="(step, index) in steps" :key="step.id" class="flex items-center">
                        <div class="flex items-center relative">
                            <div :class="[
                                'h-8 w-8 rounded-full flex items-center justify-center',
                                currentStep > index ? 'bg-blue-600' : currentStep === index ? 'bg-blue-600' : 'bg-gray-300',
                            ]">
                                <span v-if="currentStep > index" class="text-white">
                                    <Check class="h-5 w-5" />
                                </span>
                                <span v-else class="text-white">{{ index + 1 }}</span>
                            </div>
                            <span :class="[
                                'ml-3 font-medium',
                                currentStep === index ? 'text-blue-600' : 'text-gray-500'
                            ]">{{ step.name }}</span>
                        </div>
                        <div v-if="index < steps.length - 1" class="ml-4 w-20 h-0.5"
                            :class="currentStep > index ? 'bg-blue-600' : 'bg-gray-300'"></div>
                    </div>
                </div>
            </div>

            <!-- Form Steps -->
            <div class="bg-white shadow rounded-lg">
                <!-- Step 1: Empresa -->
                <div v-if="currentStep === 0" class="p-8">
                    <form @submit.prevent="validateCompanyData" class="space-y-6">
                        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div class="sm:col-span-2">
                                <label for="businessName" class="block text-sm font-medium text-gray-700">
                                    Razón Social
                                </label>
                                <input type="text" id="businessName" v-model="form.businessName" required
                                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500" />
                            </div>

                            <div>
                                <label for="ruc" class="block text-sm font-medium text-gray-700">
                                    RUC
                                </label>
                                <input type="text" id="ruc" v-model="form.ruc" required maxlength="11"
                                    pattern="^20\d{9}$"
                                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500" />
                                <p class="mt-1 text-sm text-gray-500">Solo RUC que empiecen con 20</p>
                            </div>

                            <div>
                                <label for="phone" class="block text-sm font-medium text-gray-700">
                                    Teléfono
                                </label>
                                <input type="tel" id="phone" v-model="form.phone" required
                                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500" />
                            </div>

                            <div class="sm:col-span-2">
                                <label for="address" class="block text-sm font-medium text-gray-700">
                                    Dirección Fiscal
                                </label>
                                <input type="text" id="address" v-model="form.address" required
                                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500" />
                            </div>
                        </div>

                        <div v-if="error" class="text-sm text-red-600 mt-2">
                            {{ error }}
                        </div>

                        <div class="flex justify-end">
                            <button type="submit"
                                class="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                Continuar
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Step 2: Usuario Admin -->
                <div v-if="currentStep === 1" class="p-8">
                    <form @submit.prevent="validateAdminData" class="space-y-6">
                        <div class="space-y-6">
                            <div>
                                <label for="email" class="block text-sm font-medium text-gray-700">
                                    Correo Electrónico
                                </label>
                                <input type="email" id="email" v-model="form.email" required
                                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500" />
                            </div>

                            <div>
                                <label for="password" class="block text-sm font-medium text-gray-700">
                                    Contraseña
                                </label>
                                <input type="password" id="password" v-model="form.password" required minlength="6"
                                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500" />
                                <p class="mt-1 text-sm text-gray-500">Mínimo 6 caracteres</p>
                            </div>

                            <div>
                                <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                                    Confirmar Contraseña
                                </label>
                                <input type="password" id="confirmPassword" v-model="form.confirmPassword" required
                                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500" />
                            </div>
                        </div>

                        <div v-if="error" class="text-sm text-red-600 mt-2">
                            {{ error }}
                        </div>

                        <div class="flex justify-between">
                            <button type="button" @click="currentStep--"
                                class="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                Atrás
                            </button>
                            <button type="submit"
                                class="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                Continuar
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Step 3: Plan y Pago -->
                <div v-if="currentStep === 2" class="p-8">
                    <div class="space-y-6">
                        <!-- Resumen del plan -->
                        <div class="bg-gray-50 p-6 rounded-lg">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Resumen de la contratación</h3>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Plan Anual</span>
                                    <span class="text-gray-900">{{ selectedPlanName }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Clientes incluidos</span>
                                    <span class="text-gray-900">{{ form.planClients.toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Precio base</span>
                                    <span class="text-gray-900">S/ {{ basePrice.toFixed(2) }}</span>
                                </div>
                                <div class="flex justify-between text-green-600">
                                    <span>Descuento anual (20%)</span>
                                    <span>- S/ {{ discount.toFixed(2) }}</span>
                                </div>
                                <div class="pt-4 flex justify-between font-medium">
                                    <span>Subtotal</span>
                                    <span>S/ {{ subtotal.toFixed(2) }}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span>IGV (18%)</span>
                                    <span>S/ {{ igv.toFixed(2) }}</span>
                                </div>
                                <div class="pt-4 flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span>S/ {{ total.toFixed(2) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- MercadoPago Button Container -->
                        <div id="mp-container" class="w-full"></div>

                        <div v-if="error" class="text-sm text-red-600 mt-2">
                            {{ error }}
                        </div>

                        <div class="flex justify-between">
                            <button type="button" @click="currentStep--"
                                class="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                Atrás
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Check } from 'lucide-vue-next';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';

const router = useRouter();
const error = ref('');
const currentStep = ref(0);
const mercadoPago = ref(null);

const steps = [
    { id: 'company', name: 'Empresa' },
    { id: 'admin', name: 'Usuario' },
    { id: 'payment', name: 'Pago' }
];

const form = ref({
    businessName: '',
    ruc: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: '',
    planClients: 1000,  // Número de clientes del plan
});

// Computed properties para el resumen de pago
const basePrice = computed(() => Math.ceil(form.value.planClients / 500) * 30 * 12);
const discount = computed(() => basePrice.value * 0.2);
const subtotal = computed(() => basePrice.value - discount.value);
const igv = computed(() => subtotal.value * 0.18);
const total = computed(() => subtotal.value + igv.value);
const selectedPlanName = computed(() => `${form.value.planClients} clientes`);

// Validaciones
const validateCompanyData = () => {
    error.value = '';

    if (!form.value.ruc.match(/^20\d{9}$/)) {
        error.value = 'El RUC debe empezar con 20 y tener 11 dígitos';
        return;
    }

    currentStep.value++;
};

const validateAdminData = () => {
    error.value = '';

    if (form.value.password.length < 6) {
        error.value = 'La contraseña debe tener al menos 6 caracteres';
        return;
    }

    if (form.value.password !== form.value.confirmPassword) {
        error.value = 'Las contraseñas no coinciden';
        return;
    }

    currentStep.value++;
};

import { loadMercadoPagoScript, createPreference, initMercadoPagoButton } from '@/services/mercadopago';

// Integración con MercadoPago
const initMercadoPago = async () => {
    try {
        error.value = '';

        // 1. Cargar el SDK de MercadoPago primero
        await loadMercadoPagoScript();

        // 2. Crear usuario y datos en Firebase
        await registerUser();

        // 3. Crear preferencia de pago
        const orderData = {
            planClients: form.value.planClients,
            total: total.value,
            businessName: form.value.businessName,
            ruc: form.value.ruc,
            address: form.value.address,
            isAnnual: form.value.isAnnual
        };

        const response = await fetch(`${import.meta.env.VITE_API_URL}/create-preference`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error('Error al crear la preferencia de pago');
        }

        const { id: preferenceId } = await response.json();

        // 4. Renderizar botón de pago
        const mp = new window.MercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);

        mp.checkout({
            preference: {
                id: preferenceId
            },
            render: {
                container: '#mp-container',
                label: 'Pagar ahora',
            }
        });

    } catch (error) {
        console.error('Error en initMercadoPago:', error);
        error.value = error.message || 'Error al inicializar el pago';
    }
};

// Registro en Firebase
const registerUser = async () => {
    try {
        // 1. Crear usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            form.value.email,
            form.value.password
        );

        // 2. Crear documento de usuario en Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: form.value.email,
            role: 'admin',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // 3. Crear documento de suscripción
        await setDoc(doc(db, 'subscriptions', userCredential.user.uid), {
            userId: userCredential.user.uid,
            plan: {
                type: 'annual',
                clients: form.value.planClients,
                startDate: serverTimestamp(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año desde ahora
                status: 'active',
                price: subtotal.value,
                tax: igv.value,
                total: total.value
            },
            company: {
                businessName: form.value.businessName,
                ruc: form.value.ruc,
                phone: form.value.phone,
                address: form.value.address
            },
            payment: {
                method: 'mercadopago',
                status: 'pending'
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // 4. Redirigir al dashboard
        router.push('/admin');
    } catch (err) {
        console.error('Error en el registro:', err);
        error.value = 'Error al crear la cuenta. Por favor, intente nuevamente.';
    }
};

// Manejar el evento de pago exitoso
const handlePaymentSuccess = async (paymentData) => {
    try {
        // 1. Actualizar el estado del pago en la suscripción
        const userDoc = doc(db, 'subscriptions', auth.currentUser.uid);
        await updateDoc(userDoc, {
            'payment.status': 'completed',
            'payment.data': paymentData,
            'payment.completedAt': serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // 2. Redirigir al usuario al formulario de registro de negocio
        router.push('/admin/businesses/new');
    } catch (err) {
        console.error('Error al procesar el pago:', err);
        error.value = 'Error al procesar el pago. Por favor, contacte a soporte.';
    }
};

onMounted(async () => {
    if (currentStep.value === 2) {
        await initMercadoPago();
    }
});
</script>