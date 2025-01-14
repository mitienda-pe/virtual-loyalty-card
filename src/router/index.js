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

  if (to.meta.requiresAdmin && !authStore.isAdmin && !authStore.isSuperAdmin) {
    next("/admin");
    return;
  }

  next();
});

export default router;
