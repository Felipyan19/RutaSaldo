import { auth } from "@/auth";
import { Dashboard } from "@/components/dashboard";
import { LoginScreen } from "@/components/login-screen";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string | string[] }>;
}) {
  const session = await auth();
  if (session?.user) return <Dashboard user={session.user} />;

  const params = await searchParams;
  const authError = typeof params.auth_error === "string" ? params.auth_error : undefined;
  return <LoginScreen errorCode={authError} />;
}
