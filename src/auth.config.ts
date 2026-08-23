import type { NextAuthConfig } from "next-auth";

export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
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
  providers: [], // Configured with credentials in auth.ts (Node.js runtime)
} satisfies NextAuthConfig;
