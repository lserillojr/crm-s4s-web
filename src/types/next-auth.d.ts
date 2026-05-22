import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      tenantId: string | null;
      role: string;
      phoneNumber?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string | null;
    role?: string;
    phoneNumber?: string;
  }
}
