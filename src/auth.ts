import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ensureGoogleUser } from "@/db/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !account.providerAccountId || !user.email) return false;
      if (profile?.email_verified === false) return false;

      const appUser = await ensureGoogleUser({
        providerAccountId: account.providerAccountId,
        email: user.email,
        name: user.name,
        image: user.image,
      });
      user.id = appUser.id;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = typeof token.userId === "string" ? token.userId : token.sub ?? "";
      return session;
    },
  },
});
