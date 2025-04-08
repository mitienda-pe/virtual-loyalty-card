// main.js
import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import App from "./App.vue";
import router from "./router";
import "./style.css";

// Importar Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// Importar nuestro plugin de Bootstrap que lo hace disponible globalmente
import './plugins/bootstrap';

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);
app.mount("#app");
