// stores/auth.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";

export const useAuthStore = defineStore(
  "auth",
  () => {
    const user = ref(null);
    const role = ref(null);
    const businessId = ref(null);
    const initialized = ref(false);

    const isAuthenticated = computed(() => !!user.value);
    const isSuperAdmin = computed(() => role.value === "super-admin");
    const isAdmin = computed(() => role.value === "admin");
    const isUser = computed(() => role.value === "user");

    async function loadUserRole() {
      if (!user.value) return;

      const userDoc = await getDoc(doc(db, "users", user.value.uid));
      if (userDoc.exists()) {
        role.value = userDoc.data().role;
        businessId.value = userDoc.data().businessId || null;
      }
    }

    async function signIn(email, password) {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      user.value = userCredential.user;
      await loadUserRole();
    }

    async function signOut() {
      await firebaseSignOut(auth);
      user.value = null;
      role.value = null;
      businessId.value = null;
    }

    async function initialize() {
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          user.value = firebaseUser;
          if (firebaseUser) {
            await loadUserRole();
          } else {
            role.value = null;
            businessId.value = null;
          }
          initialized.value = true;
          unsubscribe();
          resolve();
        });
      });
    }

    // Llamar a initialize cuando se crea el store
    initialize();

    return {
      user,
      role,
      businessId,
      initialized,
      isAuthenticated,
      isSuperAdmin,
      isAdmin,
      isUser,
      signIn,
      signOut,
    };
  },
  {
    persist: {
      key: "auth-store",
      storage: localStorage,
      paths: ["user", "role", "businessId"],
    },
  }
);
