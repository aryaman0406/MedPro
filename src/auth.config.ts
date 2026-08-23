import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const providers: NextAuthConfig["providers"] = [];

if (googleClientId && googleClientSecret && googleClientId.trim() !== "" && googleClientSecret.trim() !== "") {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    })
  );
}

export const authConfig = {
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "medtrack_pro_production_resilient_fallback_secret_key_2026",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  providers,
} satisfies NextAuthConfig;

