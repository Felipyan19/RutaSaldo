import { auth } from "@/auth";
import { LoginScreen } from "@/components/login-screen";
import { redirect } from "next/navigation";

export default async function AuthHome({ searchParams }: { searchParams: Promise<{ auth_error?: string | string[] }> }) {
  const session = await auth();
  if (session?.user) redirect("/resumen");

  const params = await searchParams;
  const authError = typeof params.auth_error === "string" ? params.auth_error : undefined;
  return <LoginScreen errorCode={authError} />;
}
