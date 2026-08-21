import type { NextAuthConfig } from "next-auth";
import { Role } from "@prisma/client";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  providers: [], // Configured with credentials in auth.ts (Node.js runtime)
} satisfies NextAuthConfig;
