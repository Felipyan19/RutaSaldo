import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createGoogleUser, findGoogleUser } from "@/db/users";
import { verifyGoogleAuthIntent } from "@/lib/auth-intent";
import { GOOGLE_AUTH_INTENT_COOKIE, GOOGLE_DATA_CONSENT_VERSION } from "@/lib/privacy";
import { cookies } from "next/headers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !account.providerAccountId || !user.email) return false;
      if (profile?.email_verified === false) return false;

      const intentCookie = (await cookies()).get(GOOGLE_AUTH_INTENT_COOKIE);
      const intent = verifyGoogleAuthIntent(intentCookie?.value);
      if (!intent) return "/?auth_error=auth_intent_expired";

      const existingUser = await findGoogleUser(account.providerAccountId);

      if (intent.mode === "login") {
        if (!existingUser) return "/?auth_error=not_registered";
        if (!existingUser.googleDataConsentAt || existingUser.googleDataConsentVersion !== GOOGLE_DATA_CONSENT_VERSION) {
          return "/?auth_error=consent_required";
        }

        user.id = existingUser.id;
        return true;
      }

      if (intent.consentVersion !== GOOGLE_DATA_CONSENT_VERSION) {
        return "/?auth_error=consent_required";
      }
      if (existingUser) return "/?auth_error=already_registered";

      const appUser = await createGoogleUser({
        providerAccountId: account.providerAccountId,
        email: user.email,
        name: user.name,
        image: user.image,
        consentVersion: GOOGLE_DATA_CONSENT_VERSION,
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
