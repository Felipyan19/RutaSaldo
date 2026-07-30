import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/brand-mark";

export const alt = "RutaSaldo — Tu dinero, claro";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#17231e",
          color: "#ffffff",
          display: "flex",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px 88px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
          <div style={{ alignItems: "center", display: "flex", gap: 20 }}>
            <div style={{ alignItems: "center", background: "#b7f34b", borderRadius: 28, color: "#17231e", display: "flex", height: 96, justifyContent: "center", width: 96 }}>
              <BrandMark size={62} />
            </div>
            <span style={{ fontSize: 38, fontWeight: 700 }}>RutaSaldo</span>
          </div>
          <div style={{ color: "#b7f34b", fontSize: 22, fontWeight: 600, marginTop: 72 }}>TU DINERO, CLARO</div>
          <div style={{ fontSize: 67, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05, marginTop: 18 }}>Entiende dónde está tu plata.</div>
          <div style={{ color: "#aebbb3", fontSize: 25, lineHeight: 1.4, marginTop: 26 }}>Reúne tus cuentas, ingresos y gastos en un solo lugar.</div>
        </div>
        <div style={{ background: "#b7f34b", borderRadius: 999, height: 260, opacity: 0.1, width: 260 }} />
      </div>
    ),
    size,
  );
}
