// src/services/mercadopago.js
export const loadMercadoPagoScript = () => {
  return new Promise((resolve, reject) => {
    console.log("🔄 Verificando si el script ya está cargado...");
    if (window.MercadoPago) {
      console.log("✅ MercadoPago ya está cargado");
      resolve(window.MercadoPago);
      return;
    }

    console.log("🔄 Añadiendo script al documento...");
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.type = "text/javascript";

    script.onload = () => {
      console.log("✅ Script cargado exitosamente");
      resolve(window.MercadoPago);
    };

    script.onerror = (error) => {
      console.error("❌ Error cargando script:", error);
      reject(new Error("No se pudo cargar el script de MercadoPago"));
    };

    document.head.appendChild(script);
  });
};

// En tu Checkout.vue
const initMercadoPago = async () => {
  try {
    error.value = "";
    console.log("🚀 Iniciando proceso de MercadoPago...");

    // 1. Cargar SDK
    const MercadoPagoV2 = await loadMercadoPagoScript();
    console.log("✅ SDK cargado correctamente");

    // 2. Preparar datos
    const orderData = {
      planClients: parseInt(form.value.planClients),
      total: Number(total.value),
      businessName: form.value.businessName.trim(),
      ruc: form.value.ruc.trim(),
    };

    // 3. Crear preferencia
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/createPreference`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      }
    );

    const data = await response.json();
    console.log("✅ Preferencia creada:", data);

    // 4. Inicializar MercadoPago con la clave pública de producción
    const mp = new MercadoPagoV2(
      "APP_USR-33bd217c-695c-4bf4-86b0-bf6a9d5b6bc6"
    );

    mp.checkout({
      preference: {
        id: data.id,
      },
      render: {
        container: "#mp-container",
        label: "Pagar",
        type: "wallet",
      },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    error.value = error.message;
  }
};
