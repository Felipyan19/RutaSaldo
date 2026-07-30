import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidad — RutaSaldo",
  description: "Aviso sobre el tratamiento de datos de Google en RutaSaldo.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f4f5f0] px-6 py-12 text-[#17231e] sm:px-10">
      <article className="mx-auto max-w-2xl rounded-3xl bg-white p-7 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-[#587164]">← Volver a RutaSaldo</Link>
        <p className="mt-10 text-sm font-medium text-[#587164]">Aviso de privacidad</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Tratamiento de datos de Google</h1>
        <p className="mt-5 leading-7 text-[#5e6d63]">Para iniciar sesión, RutaSaldo usa Google OAuth. Antes de continuar debes aceptar este tratamiento.</p>

        <h2 className="mt-9 text-lg font-semibold">Datos que recibimos</h2>
        <p className="mt-2 leading-7 text-[#5e6d63]">Google puede compartir tu nombre, dirección de correo, foto de perfil y un identificador único de cuenta. RutaSaldo no solicita acceso a Drive, contactos, calendario ni archivos de Google.</p>

        <h2 className="mt-8 text-lg font-semibold">Para qué los usamos</h2>
        <p className="mt-2 leading-7 text-[#5e6d63]">Usamos esos datos para autenticarte, crear tu cuenta si es tu primer acceso, asociarte con un workspace privado y permitirte volver a entrar a tus datos financieros.</p>

        <h2 className="mt-8 text-lg font-semibold">Dónde se almacenan</h2>
        <p className="mt-2 leading-7 text-[#5e6d63]">El correo, nombre, foto, identificador de Google y la fecha de aceptación se almacenan en la base de datos de RutaSaldo. Tus movimientos financieros se guardan separados en tu workspace privado.</p>

        <h2 className="mt-8 text-lg font-semibold">Tu decisión</h2>
        <p className="mt-2 leading-7 text-[#5e6d63]">Puedes no aceptar, pero no podrás registrarte ni acceder a un workspace financiero. Si aceptas, podrás retirar tu autorización de Google desde tu cuenta de Google; para solicitar la eliminación de tus datos de RutaSaldo, contacta al responsable de la aplicación.</p>

        <p className="mt-10 border-t border-[#e8ede9] pt-5 text-xs text-[#5e6d63]">Versión del consentimiento: v1 · Última actualización: 30 de julio de 2026</p>
      </article>
    </main>
  );
}
