import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RutaSaldo — Tu dinero, claro",
    short_name: "RutaSaldo",
    description: "Controla cuentas, ingresos y gastos sin perder de vista tu saldo real.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#17231e",
    theme_color: "#17231e",
    lang: "es-CO",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/rutasaldo-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/rutasaldo-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/rutasaldo-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Abrir RutaSaldo", short_name: "Abrir", url: "/", icons: [{ src: "/icons/rutasaldo-192.png", sizes: "192x192" }] },
    ],
  };
}
