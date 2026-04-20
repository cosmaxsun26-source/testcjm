import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

const LOGIN_PATH = "/login";

function sanitizeCallbackUrl(callbackUrl: string) {
  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/";
  }
  return callbackUrl;
}

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: LOGIN_PATH,
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ request, auth }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === LOGIN_PATH;
      const isAuthRoute = nextUrl.pathname.startsWith("/api/auth");

      if (isAuthRoute) {
        return true;
      }

      if (isLoginPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      if (isLoggedIn) {
        return true;
      }

      if (nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const loginUrl = new URL(LOGIN_PATH, nextUrl);
      loginUrl.searchParams.set(
        "callbackUrl",
        sanitizeCallbackUrl(`${nextUrl.pathname}${nextUrl.search}`)
      );
      return Response.redirect(loginUrl);
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "viewer" | "editor" | "admin";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
