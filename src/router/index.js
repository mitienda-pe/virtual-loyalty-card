// router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { getAuth } from "firebase/auth";
import { useAuthStore } from "@/stores/auth";
import LoyaltyCard from "@/components/LoyaltyCard.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/views/Home.vue"),
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/Login.vue"),
  },
  {
    path: "/admin",
    component: () => import("@/views/admin/AdminLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "AdminDashboard",
        component: () => import("@/views/admin/Dashboard.vue"),
      },
      // Rutas para SuperAdmin
      {
        path: "businesses",
        name: "BusinessList",
        component: () => import("@/views/admin/BusinessList.vue"),
        meta: { requiresSuperAdmin: true },
      },
      {
        path: "businesses/new",
        name: "BusinessCreate",
        component: () => import("@/views/admin/BusinessForm.vue"),
        meta: { requiresSuperAdmin: true },
      },
      {
        path: "businesses/:id/edit",
        name: "BusinessEdit",
        component: () => import("@/views/admin/BusinessForm.vue"),
        meta: { requiresSuperAdmin: true },
      },
      // Nuevas rutas para gestión de usuarios (SuperAdmin)
      {
        path: "users",
        name: "UserList",
        component: () => import("@/views/admin/UserList.vue"),
        meta: { requiresSuperAdmin: true },
      },
      {
        path: "users/new",
        name: "UserCreate",
        component: () => import("@/views/admin/UserForm.vue"),
        meta: { requiresSuperAdmin: true },
      },
      {
        path: "users/:id/edit",
        name: "UserEdit",
        component: () => import("@/views/admin/UserForm.vue"),
        meta: { requiresSuperAdmin: true },
      },
      // Ruta para estadísticas (SuperAdmin)
      {
        path: "statistics",
        name: "Statistics",
        component: () => import("@/views/admin/Statistics.vue"),
        meta: { requiresSuperAdmin: true },
      },
      // Ruta para consumos de clientes (SuperAdmin)
      {
        path: "client-consumption",
        name: "ClientConsumption",
        component: () => import("@/views/admin/ClientConsumption.vue"),
        meta: { requiresSuperAdmin: true },
      },
      // Ruta para lista de clientes
      {
        path: "clients",
        name: "ClientList",
        component: () => import("@/views/admin/ClientList.vue"),
        meta: { requiresSuperAdmin: true },
      },
      // Ruta para detalle de cliente con sus consumos
      {
        path: "clients/:phoneNumber",
        name: "ClientDetail",
        component: () => import("@/views/admin/ClientDetail.vue"),
        props: true,
        meta: { requiresSuperAdmin: true },
      },
      // Ruta para editar cliente
      {
        path: "clients/:phoneNumber/edit",
        name: "ClientEdit",
        component: () => import("@/views/admin/ClientForm.vue"),
        props: true,
        meta: { requiresSuperAdmin: true },
      },
      // Ruta para configuración de WhatsApp (SuperAdmin)
      {
        path: "whatsapp",
        name: "WhatsAppConfig",
        component: () => import("@/views/admin/WhatsAppConfig.vue"),
        meta: { requiresSuperAdmin: true },
      },
      // Ruta para perfil de usuario
      {
        path: "profile",
        name: "AdminProfile",
        component: () => import("@/views/admin/Profile.vue"),
      },
      // Rutas para Business Admin
      {
        path: "business/dashboard",
        name: "BusinessDashboard",
        component: () => import("@/views/admin/business/Dashboard.vue"),
        meta: { requiresBusinessAdmin: true },
      },
      {
        path: "business/clients",
        name: "BusinessClients",
        component: () => import("@/views/admin/business/ClientList.vue"),
        meta: { requiresBusinessAdmin: true },
      },
      {
        path: "business/consumos",
        name: "BusinessConsumos",
        component: () => import("@/views/admin/business/ConsumptionList.vue"),
        meta: { requiresBusinessAdmin: true },
      },
      {
        path: "business/rewards",
        name: "BusinessRewards",
        component: () => import("@/views/admin/business/RewardsList.vue"),
        meta: { requiresBusinessAdmin: true },
      },
      // Ruta para editar negocio (Business Admin)
      {
        path: "business/settings",
        name: "BusinessSettings",
        component: () => import("@/views/admin/business/BusinessSettings.vue"),
        meta: { requiresBusinessAdmin: true },
      },
    ],
  },
  // Rutas para Business Client
  {
    path: "/client",
    component: () => import("@/views/client/ClientLayout.vue"),
    meta: { requiresAuth: true, requiresBusinessClient: true },
    children: [
      {
        path: "",
        name: "ClientDashboard",
        component: () => import("@/views/client/Dashboard.vue"),
      },
      {
        path: "businesses",
        name: "ClientBusinesses",
        component: () => import("@/views/client/BusinessList.vue"),
      },
      {
        path: "business/:businessId",
        name: "ClientBusinessDetail",
        component: () => import("@/views/client/BusinessDetail.vue"),
        props: true,
      },
      {
        path: "consumos",
        name: "ClientConsumos",
        component: () => import("@/views/client/ConsumptionList.vue"),
      },
      {
        path: "rewards",
        name: "ClientRewards",
        // (Ruta eliminada: RewardList.vue ya no existe)

      },
    ],
  },
  {
    path: "/:businessSlug/:phone",
    name: "LoyaltyCard",
    component: LoyaltyCard,
    props: true,
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFound.vue"),
  },
  {
    path: "/checkout",
    name: "Checkout",
    component: () => import("@/views/Checkout.vue"),
  },
  {
    path: "/privacy-policy",
    name: "PrivacyPolicy",
    component: () => import("@/components/PrivacyPolicy.vue"),
  },
  {
    path: "/terms-and-conditions",
    name: "TermsAndConditions",
    component: () => import("@/components/TermsAndConditions.vue"),
  },
  {
    path: "/data-deletion",
    name: "DataDeletion",
    component: () => import("@/components/DataDeletion.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Protección de rutas
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Esperar a que el store esté inicializado
  if (!authStore.initialized) {
    // Esperar a que termine la inicialización
    await new Promise((resolve) => {
      const unsubscribe = setInterval(() => {
        if (authStore.initialized) {
          clearInterval(unsubscribe);
          resolve();
        }
      }, 50);
    });
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next("/login");
    return;
  }

  if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
    next("/admin");
    return;
  }

  if (to.meta.requiresBusinessAdmin && !authStore.isBusinessAdmin && !authStore.isSuperAdmin) {
    next("/admin");
    return;
  }

  if (to.meta.requiresBusinessClient && !authStore.isBusinessClient) {
    next("/admin");
    return;
  }

  next();
});

export default router;
