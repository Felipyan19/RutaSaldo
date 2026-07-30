import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "RutaSaldo — Tu dinero, claro",
  description: "Controla cuentas, ingresos y gastos sin perder de vista tu saldo real.",
  applicationName: "RutaSaldo",
  manifest: "/manifest.webmanifest",
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
