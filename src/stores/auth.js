// stores/auth.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/firebase";

export const useAuthStore = defineStore(
  "auth",
  () => {
    const user = ref(null);
    const role = ref(null);
    const businessId = ref(null);
    const initialized = ref(false);
    const clientBusinesses = ref([]);

    const isAuthenticated = computed(() => !!user.value);
    const isSuperAdmin = computed(() => role.value === "super-admin");
    const isBusinessAdmin = computed(() => role.value === "business-admin");
    const isBusinessClient = computed(() => role.value === "business-client");

    async function loadUserRole() {
      if (!user.value) return;

      const userDoc = await getDoc(doc(db, "users", user.value.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        role.value = userData.role;
        
        // Si es un admin de negocio, cargamos su businessId
        if (userData.role === "business-admin") {
          businessId.value = userData.businessId || null;
        } else {
          businessId.value = null;
        }
        
        // Si es un cliente, cargamos todos los negocios a los que pertenece
        if (userData.role === "business-client") {
          await loadClientBusinesses();
        } else {
          clientBusinesses.value = [];
        }
      }
    }
    
    async function loadClientBusinesses() {
      if (!user.value || role.value !== "business-client") return;
      
      // Consultar la colección client_businesses para obtener todos los negocios del cliente
      const clientBusinessesQuery = query(
        collection(db, "client_businesses"),
        where("clientId", "==", user.value.uid)
      );
      
      const snapshot = await getDocs(clientBusinessesQuery);
      clientBusinesses.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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
      clientBusinesses.value = [];
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
            clientBusinesses.value = [];
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
      clientBusinesses,
      initialized,
      isAuthenticated,
      isSuperAdmin,
      isBusinessAdmin,
      isBusinessClient,
      signIn,
      signOut,
      loadClientBusinesses,
    };
  },
  {
    persist: {
      key: "auth-store",
      storage: localStorage,
      paths: ["user", "role", "businessId", "clientBusinesses"],
    },
  }
);
