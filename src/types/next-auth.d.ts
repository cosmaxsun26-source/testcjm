import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "viewer" | "editor" | "admin";
    };
  }

  interface User {
    role: "viewer" | "editor" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "viewer" | "editor" | "admin";
  }
}
