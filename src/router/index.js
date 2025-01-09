// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import LoyaltyCard from "@/components/LoyaltyCard.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/views/Home.vue"),
  },
  {
    path: "/card/:phone",
    name: "LoyaltyCard",
    component: LoyaltyCard,
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

export default router;
