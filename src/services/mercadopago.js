// src/services/mercadopago.js

export const loadMercadoPagoScript = () => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Error loading MercadoPago SDK"));
    };
    document.body.appendChild(script);
  });
};

export const createPreference = async (orderData) => {
  try {
    const response = await fetch("/api/create-preference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const preference = await response.json();
    return preference;
  } catch (error) {
    console.error("Error creating preference:", error);
    throw error;
  }
};

export const initMercadoPagoButton = (preferenceId, options = {}) => {
  // Asegurarnos de que MercadoPago está disponible
  if (!window.MercadoPago) {
    throw new Error("MercadoPago SDK not loaded");
  }

  const mp = new window.MercadoPago(
    import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY,
    {
      locale: "es-PE",
    }
  );

  const bricksBuilder = mp.bricks();

  bricksBuilder.create("wallet", "mp-container", {
    initialization: {
      preferenceId: preferenceId,
    },
    callbacks: {
      onError: options.onError || (() => {}),
      onReady: options.onReady || (() => {}),
      onSubmit: options.onSubmit || (() => {}),
    },
    customization: {
      texts: {
        action: "Pagar la suscripción",
      },
      visual: {
        buttonBackground: "blue",
        borderRadius: "8px",
      },
    },
  });
};
