import { type NextAuthConfig } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import Credentials from "next-auth/providers/credentials";
import { env } from "@/lib/env";
import { mapJwtClaims, mapSession, type ClaimSource } from "@/lib/auth/claims";

/**
 * Config Auth.js **edge-safe** — providers + callbacks puros, SEM acesso a
 * banco. É a base usada pelo `middleware.ts` (edge runtime), por isso não pode
 * importar `@/lib/db` (postgres-js é Node-only e quebra o bundle edge).
 *
 * O `auth.ts` (route handler, Node runtime) estende isto com o callback
 * `signIn` que faz o upsert app-side do user.
 */
const useMock =
  process.env.E2E_AUTH_MOCK === "1" && process.env.NODE_ENV !== "production";

const providers: NextAuthConfig["providers"] = [];

if (env.AUTH_KEYCLOAK_ID && env.AUTH_KEYCLOAK_SECRET && env.AUTH_KEYCLOAK_ISSUER) {
  providers.push(
    Keycloak({
      clientId: env.AUTH_KEYCLOAK_ID,
      clientSecret: env.AUTH_KEYCLOAK_SECRET,
      issuer: env.AUTH_KEYCLOAK_ISSUER,
    }),
  );
}

if (useMock) {
  // Provider só-teste: NUNCA habilitado em produção (guard acima).
  providers.push(
    Credentials({
      id: "credentials",
      name: "E2E Mock",
      credentials: { email: {} },
      authorize: async (creds) => ({
        id: "e2e-user",
        email: String(creds?.email ?? "maria@teste.dev"),
        name: "Maria E2E",
        tenant_id: "11111111-1111-1111-1111-111111111111",
        role: "owner",
        phone_number: "+5511999999999",
      }),
    }),
  );
}

export const authConfig = {
  providers,
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, profile, user }) {
      // OIDC entrega claims em `profile`; o mock entrega em `user`.
      const source = (profile ?? user) as ClaimSource | undefined;
      return mapJwtClaims(token, source);
    },
    session({ session, token }) {
      return mapSession(session, token);
    },
  },
} satisfies NextAuthConfig;
