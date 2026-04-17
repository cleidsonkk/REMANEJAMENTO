import type { UserRole, UserStatus } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.secretariaId = user.secretariaId;
        token.secretariaIds = user.secretariaIds ?? [];
        token.status = user.status;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as UserRole;
        session.user.secretariaId = (token.secretariaId as string | null) ?? null;
        session.user.secretariaIds = Array.isArray(token.secretariaIds)
          ? token.secretariaIds.map((value) => String(value))
          : [];
        session.user.status = token.status as UserStatus;
      }

      return session;
    },
    authorized({ auth, request }) {
      const isLogged = !!auth?.user;
      const pathname = request.nextUrl.pathname;

      if (pathname.startsWith("/login")) {
        return true;
      }

      return isLogged;
    },
  },
} satisfies NextAuthConfig;
