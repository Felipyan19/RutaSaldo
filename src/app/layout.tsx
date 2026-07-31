import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import "./form-controls.css";
import "./motion.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "RutaSaldo — Tu dinero, claro",
  description: "Controla cuentas, ingresos y gastos sin perder de vista tu saldo real.",
  applicationName: "RutaSaldo",
  metadataBase: new URL("https://ruta-saldo.vercel.app"),
  authors: [{ name: "RutaSaldo" }],
  creator: "RutaSaldo",
  publisher: "RutaSaldo",
  keywords: ["finanzas personales", "presupuesto", "gastos", "cuentas", "Colombia"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "https://ruta-saldo.vercel.app",
    siteName: "RutaSaldo",
    title: "RutaSaldo — Tu dinero, claro",
    description: "Controla cuentas, ingresos y gastos sin perder de vista tu saldo real.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "RutaSaldo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RutaSaldo — Tu dinero, claro",
    description: "Controla cuentas, ingresos y gastos sin perder de vista tu saldo real.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: "#17231e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={manrope.className}>{children}</body>
    </html>
  );
}
