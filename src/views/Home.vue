<!-- src/views/Home.vue -->
<template>
    <div class="min-h-screen bg-gray-50">

        <!-- Navigation -->
        <nav class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16 items-center">
                    <div class="flex items-center">
                        <img :src="logo" alt="Loyalty Card Logo" class="h-10 w-auto mr-4" />
                        <h1 class="text-xl font-bold text-gray-800">Loyalty Card</h1>
                    </div>
                    <div>
                        <router-link to="/login"
                            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50">
                            Iniciar sesión
                        </router-link>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <div class="relative bg-white">
            <div class="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
                <div class="flex flex-col lg:flex-row items-center gap-12">
                    <div class="lg:w-1/2">
                        <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                            Fideliza a tus clientes de manera digital
                        </h1>
                        <p class="mt-6 text-lg leading-8 text-gray-600">
                            Reemplaza las tarjetas físicas por una solución digital moderna. Tus clientes acumulan
                            puntos enviando sus comprobantes por WhatsApp.
                        </p>
                        <div class="mt-10 flex items-center gap-x-6">
                            <button
                                class="rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                                Empezar ahora
                            </button>
                            <router-link to="/login"
                                class="flex items-center text-base font-semibold leading-6 text-gray-900 hover:text-blue-600">
                                Ingresar al panel
                                <ArrowRight class="ml-2 h-4 w-4" />
                            </router-link>
                        </div>
                    </div>
                    <div class="lg:w-1/2">
                        <div class="aspect-[9/16] w-full max-w-sm mx-auto bg-gray-100 rounded-xl overflow-hidden">
                            <video :src="demoVideo" class="w-full h-full object-cover" autoplay loop muted
                                playsinline></video>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Features Section -->
        <div class="py-24 sm:py-32 bg-white">
            <div class="mx-auto max-w-7xl px-6 lg:px-8">
                <div class="mx-auto max-w-2xl lg:text-center">
                    <h2 class="text-base font-semibold leading-7 text-blue-600">Todo automatizado</h2>
                    <p class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Todo lo que necesitas para fidelizar clientes
                    </p>
                </div>
                <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                    <dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                        <div class="flex flex-col">
                            <dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                                <Store class="h-5 w-5 flex-none text-blue-600" />
                                Fácil de implementar
                            </dt>
                            <dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                                <p class="flex-auto">Sin necesidad de instalar nada. Tus clientes solo necesitan
                                    WhatsApp.</p>
                            </dd>
                        </div>
                        <div class="flex flex-col">
                            <dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                                <Heart class="h-5 w-5 flex-none text-blue-600" />
                                Aumenta la retención
                            </dt>
                            <dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                                <p class="flex-auto">Premia a tus clientes frecuentes y aumenta sus visitas recurrentes.
                                </p>
                            </dd>
                        </div>
                        <div class="flex flex-col">
                            <dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                                <Star class="h-5 w-5 flex-none text-blue-600" />
                                Personalizable
                            </dt>
                            <dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                                <p class="flex-auto">Adapta el programa a tu negocio: define visitas, premios y más.</p>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>

        <!-- Business Types Section -->
        <div class="py-24 sm:py-32">
            <div class="mx-auto max-w-7xl px-6 lg:px-8">
                <div class="mx-auto max-w-2xl lg:text-center">
                    <h2 class="text-base font-semibold leading-7 text-blue-600">Para todo tipo de negocios</h2>
                    <p class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        ¿Qué negocios pueden implementar un programa de cliente frecuente?
                    </p>
                    <p class="mt-6 text-lg leading-8 text-gray-600">
                        Cualquier negocio que busque fidelizar a sus clientes y aumentar las visitas recurrentes puede
                        beneficiarse de nuestro sistema
                    </p>
                </div>
                <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                    <dl class="grid grid-cols-2 gap-x-8 gap-y-16 lg:grid-cols-4">
                        <div v-for="business in businessTypes" :key="business.name" class="text-center">
                            <dt class="flex flex-col items-center gap-y-4">
                                <component :is="business.icon" class="h-12 w-12 text-blue-600" />
                                <span class="text-base font-semibold leading-7 text-gray-900">{{ business.name }}</span>
                            </dt>
                            <dd class="mt-1 text-sm leading-7 text-gray-600">{{ business.description }}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>

        <!-- Testimonials Section -->
        <div class="bg-white py-24 sm:py-32">
            <div class="mx-auto max-w-7xl px-6 lg:px-8">
                <div class="mx-auto max-w-xl text-center">
                    <h2 class="text-lg font-semibold leading-8 tracking-tight text-blue-600">Testimonios</h2>
                    <p class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Descubre lo que dicen nuestros clientes
                    </p>
                </div>
                <div class="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
                    <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        <figure v-for="testimonial in testimonials" :key="testimonial.name"
                            class="rounded-2xl bg-gray-50 p-8 text-sm leading-6">
                            <blockquote class="text-gray-900">
                                <p>"{{ testimonial.quote }}"</p>
                            </blockquote>
                            <figcaption class="mt-6 flex items-center gap-x-4">
                                <div class="font-semibold text-gray-900">{{ testimonial.name }}</div>
                                <div class="text-gray-600">{{ testimonial.role }}</div>
                            </figcaption>
                        </figure>
                    </div>
                </div>
            </div>
        </div>



        <!-- Pricing Section -->
        <div class="py-24 sm:py-32">
            <div class="mx-auto max-w-7xl px-6 lg:px-8">
                <div class="mx-auto max-w-2xl sm:text-center">
                    <h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Precios simples y
                        transparentes</h2>
                    <p class="mt-6 text-lg leading-8 text-gray-600">
                        Solo pagas por los clientes activos en tu programa de fidelización
                    </p>
                </div>
                <div
                    class="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-gray-200 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
                    <div class="p-8 sm:p-10 lg:flex-auto">
                        <h3 class="text-2xl font-bold tracking-tight text-gray-900">Membresía mensual</h3>
                        <p class="mt-6 text-base leading-7 text-gray-600">
                            Incluye todas las funcionalidades:
                        </p>
                        <div class="mt-8">
                            <ul class="grid grid-cols-1 gap-4 text-sm leading-6 text-gray-600 sm:grid-cols-2">
                                <li class="flex gap-x-3">
                                    <ShieldCheck class="h-6 w-5 flex-none text-blue-600" />
                                    Hasta 1000 clientes activos
                                </li>
                                <li class="flex gap-x-3">
                                    <ShieldCheck class="h-6 w-5 flex-none text-blue-600" />
                                    Soporte WhatsApp ilimitado
                                </li>
                                <li class="flex gap-x-3">
                                    <ShieldCheck class="h-6 w-5 flex-none text-blue-600" />
                                    Panel de administración
                                </li>
                                <li class="flex gap-x-3">
                                    <ShieldCheck class="h-6 w-5 flex-none text-blue-600" />
                                    Reportes y estadísticas
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0">
                        <div
                            class="rounded-2xl bg-gray-50 py-10 text-center ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-center lg:py-16">
                            <div class="mx-auto max-w-xs px-8">
                                <p class="text-base font-semibold text-gray-600">Calcula tu plan</p>

                                <!-- Switch de período -->
                                <div class="mt-6">
                                    <div class="flex items-center justify-center gap-x-4">
                                        <span :class="[!isAnnual ? 'text-blue-600' : 'text-gray-500']">Mensual</span>
                                        <button type="button" @click="isAnnual = !isAnnual"
                                            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                                            :class="isAnnual ? 'bg-blue-600' : 'bg-gray-200'">
                                            <span
                                                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                                :class="isAnnual ? 'translate-x-5' : 'translate-x-0'" />
                                        </button>
                                        <span :class="[isAnnual ? 'text-blue-600' : 'text-gray-500']">
                                            Anual
                                            <span class="ml-1 text-xs text-green-600">-20%</span>
                                        </span>
                                    </div>
                                </div>

                                <!-- Control del número de clientes -->
                                <div class="mt-6">
                                    <div class="flex justify-between items-center mb-4">
                                        <label class="block text-sm font-medium text-gray-700">
                                            Número de clientes
                                        </label>
                                        <span class="text-lg font-semibold text-blue-600">
                                            {{ selectedClients.toLocaleString() }}
                                        </span>
                                    </div>

                                    <!-- Slider para plan mensual -->
                                    <div v-if="!isAnnual" class="space-y-4">
                                        <select v-model="selectedClients"
                                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                            <option v-for="value in monthlyPlans" :key="value" :value="value">
                                                {{ value.toLocaleString() }} clientes
                                            </option>
                                        </select>
                                    </div>

                                    <!-- Slider para plan anual -->
                                    <div v-else class="space-y-4">
                                        <input type="range" v-model="selectedClients" :min="500" :max="10000"
                                            :step="500"
                                            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                        <div class="flex justify-between text-xs text-gray-600">
                                            <span>500</span>
                                            <span>2.5K</span>
                                            <span>5K</span>
                                            <span>7.5K</span>
                                            <span>10K</span>
                                        </div>
                                    </div>

                                    <!-- Texto descriptivo -->
                                    <p class="mt-2 text-sm text-gray-500">
                                        {{ isAnnual
                                            ? 'En plan anual puedes elegir cualquier cantidad de clientes'
                                            : 'Selecciona uno de nuestros planes mensuales predefinidos' }}
                                    </p>
                                </div>

                                <!-- Precio calculado -->
                                <div class="mt-6">
                                    <p class="flex items-baseline justify-center gap-x-2">
                                        <span class="text-5xl font-bold tracking-tight text-gray-900">S/
                                            {{ calculatedPrice }}</span>
                                        <span class="text-sm font-semibold leading-6 tracking-wide text-gray-600">+
                                            IGV</span>
                                    </p>
                                    <p class="mt-2 text-sm text-gray-500 text-center">
                                        {{ isAnnual ? 'al año' : 'al mes' }} por {{ selectedClients.toLocaleString() }}
                                        clientes
                                    </p>
                                    <p v-if="isAnnual" class="mt-1 text-sm text-green-600 text-center">
                                        Ahorras S/ {{ savingsAmount }} al año
                                    </p>
                                </div>

                                <button
                                    class="mt-10 block w-full rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                                    Contratar ahora
                                </button>
                                <p class="mt-6 text-xs leading-5 text-gray-600">
                                    {{ isAnnual ? 'Facturación anual' : 'Facturación mensual' }}. Cancela cuando
                                    quieras.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Contact CTA -->
        <div class="bg-white">
            <div class="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
                <div class="mx-auto max-w-2xl text-center">
                    <h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        ¿Tienes dudas?
                    </h2>
                    <p class="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
                        Contáctanos y te ayudaremos a implementar el programa de fidelización ideal para tu negocio
                    </p>
                    <div class="mt-10 flex items-center justify-center gap-x-6">
                        <a href="https://wa.me/51999999999"
                            class="flex items-center rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500">
                            <Phone class="mr-2 h-5 w-5" />
                            Contactar por WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- FAQ Section -->
        <div class="bg-gray-50 py-24 sm:py-32">
            <div class="mx-auto max-w-7xl px-6 lg:px-8">
                <div class="mx-auto max-w-2xl lg:text-center">
                    <h2 class="text-base font-semibold leading-7 text-blue-600">FAQ</h2>
                    <p class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Preguntas frecuentes
                    </p>
                    <p class="mt-6 text-lg leading-8 text-gray-600">
                        Todo lo que necesitas saber sobre nuestro programa de fidelización
                    </p>
                </div>
                <div class="mx-auto mt-16 max-w-2xl">
                    <dl class="space-y-8">
                        <div v-for="(faq, index) in faqs" :key="index" class="bg-white p-8 rounded-lg shadow-sm">
                            <dt class="text-lg font-semibold leading-7 text-gray-900">
                                {{ faq.question }}
                            </dt>
                            <dd class="mt-4 text-base leading-7 text-gray-600">
                                {{ faq.answer }}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer class="bg-white">
            <div class="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
                <div class="mt-8 md:order-1 md:mt-0">
                    <p class="text-center text-xs leading-5 text-gray-500">
                        &copy; {{ currentYear }} Tiendas Virtuales Latinoamérica SAC. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import logo from '@/assets/logo.svg';
import demoVideo from '@/assets/4795437-hd_720_1366_25fps.mp4';
import {
    ArrowRight,
    Store,
    Heart,
    Star,
    Phone,
    ShieldCheck,
    Coffee,
    IceCream,
    Wine,
    Scissors,
    Dog,
    Shirt,
    Pizza,
    Cookie
} from 'lucide-vue-next'

const businessTypes = [
    {
        name: 'Cafeterías',
        icon: Coffee,
        description: 'Premia a tus clientes por sus visitas diarias'
    },
    {
        name: 'Heladerías',
        icon: IceCream,
        description: 'Incentiva el consumo recurrente con promociones'
    },
    {
        name: 'Bares',
        icon: Wine,
        description: 'Fideliza a tus clientes habituales'
    },
    {
        name: 'Salones y Barberías',
        icon: Scissors,
        description: 'Mantén a tus clientes regresando cada mes'
    },
    {
        name: 'Petshops',
        icon: Dog,
        description: 'Premia la lealtad de dueños de mascotas'
    },
    {
        name: 'Lavanderías',
        icon: Shirt,
        description: 'Incentiva el uso regular de tus servicios'
    },
    {
        name: 'Restaurantes',
        icon: Pizza,
        description: 'Recompensa a tus comensales frecuentes'
    },
    {
        name: 'Panaderías',
        icon: Cookie,
        description: 'Premia las visitas diarias de tus clientes'
    }
]

const selectedClients = ref(1000)
const isAnnual = ref(false)

// Planes mensuales fijos
const monthlyPlans = [500, 1000, 2500, 5000, 10000]

// Watcher para ajustar a planes fijos en modo mensual
watch(isAnnual, (newValue) => {
    if (!newValue) {
        // Si cambia a plan mensual, ajustar al plan más cercano
        const closest = monthlyPlans.reduce((prev, curr) => {
            return Math.abs(curr - selectedClients.value) < Math.abs(prev - selectedClients.value) ? curr : prev
        })
        selectedClients.value = closest
    }
})

const basePrice = computed(() => {
    // S/30 por cada 500 clientes
    return Math.ceil(selectedClients.value / 500) * 30
})

const calculatedPrice = computed(() => {
    let price = basePrice.value
    if (isAnnual.value) {
        // 20% de descuento en plan anual
        price = price * 0.8 * 12
    }
    return price.toString()
})

const savingsAmount = computed(() => {
    if (!isAnnual.value) return 0
    const monthlyPrice = basePrice.value
    const yearlyPriceRegular = monthlyPrice * 12
    const yearlyPriceDiscounted = monthlyPrice * 12 * 0.8
    return Math.round(yearlyPriceRegular - yearlyPriceDiscounted)
})

const testimonials = [
    {
        name: 'María García',
        role: 'Dueña de Café del Valle',
        quote: 'Desde que implementamos el programa de fidelización, hemos visto un incremento del 40% en clientes recurrentes. La facilidad de uso con WhatsApp ha sido clave para su éxito.'
    },
    {
        name: 'Carlos Rodríguez',
        role: 'Gerente de Barbería Brooklyn',
        quote: 'Nuestros clientes adoran el sistema digital. Es mucho más conveniente que las tarjetas físicas y nos permite tener un mejor control de nuestro programa de fidelización.'
    },
    {
        name: 'Ana Mendoza',
        role: 'Propietaria de Heladería Frozen',
        quote: 'La implementación fue súper sencilla y el soporte es excelente. Nuestros clientes aprecian poder acumular puntos simplemente enviando una foto de su ticket por WhatsApp.'
    }
]

const faqs = [
    {
        question: "¿Cómo funciona el programa de fidelización?",
        answer: "Es muy simple: tus clientes envían una foto de su comprobante de pago por WhatsApp, nuestro sistema verifica automáticamente la compra y acumula puntos en su tarjeta digital. Cuando completan el número requerido de visitas, obtienen su premio."
    },
    {
        question: "¿Necesito instalar algún software o hardware?",
        answer: "No, nuestro sistema funciona completamente en la nube. Solo necesitas tener WhatsApp para recibir los comprobantes de tus clientes. Todo el proceso es digital y automatizado."
    },
    {
        question: "¿Cómo se previene el fraude o la duplicación de comprobantes?",
        answer: "Nuestro sistema utiliza tecnología de reconocimiento óptico y validación cruzada para detectar duplicados. Además, implementamos límites de tiempo entre compras y verificación de autenticidad de los comprobantes."
    },
    {
        question: "¿Puedo personalizar el programa según mis necesidades?",
        answer: "Sí, puedes configurar el número de visitas necesarias, el tiempo mínimo entre compras, los premios, y más. También puedes personalizar el diseño de la tarjeta digital con tus colores e imagen corporativa."
    },
    {
        question: "¿Qué pasa si un cliente pierde su número de teléfono?",
        answer: "Los clientes pueden solicitar la transferencia de su historial de compras a un nuevo número. Nuestro sistema mantiene un registro seguro de todas las transacciones."
    },
    {
        question: "¿Cómo puedo ver las estadísticas de mi programa?",
        answer: "Tienes acceso a un panel de control completo donde puedes ver estadísticas en tiempo real: número de clientes activos, frecuencia de visitas, premios canjeados, y más información relevante para tu negocio."
    },
    {
        question: "¿El sistema funciona las 24 horas?",
        answer: "Sí, el sistema está disponible 24/7. Tus clientes pueden enviar sus comprobantes en cualquier momento y recibirán una respuesta automática inmediata."
    },
    {
        question: "¿Qué soporte técnico ofrecen?",
        answer: "Ofrecemos soporte técnico por WhatsApp y correo electrónico. Además, proporcionamos materiales de capacitación y asistencia en la configuración inicial de tu programa."
    }
];



const currentYear = computed(() => new Date().getFullYear())
</script>