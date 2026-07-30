import { BrandMark } from "@/components/brand-mark";

export function RutaSaldoLoader({
  label = "Cargando RutaSaldo…",
  variant = "dark",
  mode = "fullscreen",
}: {
  label?: string;
  variant?: "dark" | "light";
  mode?: "fullscreen" | "page";
}) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className={`rutasaldo-loader rutasaldo-loader--${variant} rutasaldo-loader--${mode}`}
    >
      <div className="rutasaldo-loader__glow rutasaldo-loader__glow--one" />
      <div className="rutasaldo-loader__glow rutasaldo-loader__glow--two" />
      <div className="rutasaldo-loader__content">
        <div className="rutasaldo-loader__mark" aria-hidden="true">
          <span className="rutasaldo-loader__orbit rutasaldo-loader__orbit--one" />
          <span className="rutasaldo-loader__orbit rutasaldo-loader__orbit--two" />
          <span className="rutasaldo-loader__mark-box"><BrandMark size={54} title="" /></span>
        </div>
        <p className="rutasaldo-loader__name">RutaSaldo</p>
        <p className="rutasaldo-loader__label">{label}</p>
        <span className="rutasaldo-loader__progress" aria-hidden="true" />
      </div>
    </main>
  );
}
