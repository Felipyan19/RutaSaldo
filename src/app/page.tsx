import { auth } from "@/auth";
import { Dashboard } from "@/components/dashboard";
import { LoginScreen } from "@/components/login-screen";

export default async function Home() {
  const session = await auth();
  if (session?.user) return <Dashboard user={session.user} />;
  return <LoginScreen />;
}
