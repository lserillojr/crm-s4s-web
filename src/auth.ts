import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { upsertKeycloakUser, type UpsertSource } from "@/lib/auth/upsert-user";

/**
 * Config completa do Auth.js (route handler, Node runtime). Estende o
 * `authConfig` edge-safe com o callback `signIn`, que faz o **upsert app-side**
 * do user no Postgres (decisão 6d — sync no callback, não via webhook/WF16).
 *
 * Fail-closed: se o upsert falhar, o callback propaga o erro e o login é
 * negado (melhor que emitir sessão sem a row local que o wizard/dashboard
 * precisam). Só roda pro provider `keycloak` — o mock E2E (DATABASE_URL stub)
 * pula o DB.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile, user }) {
      if (account?.provider !== "keycloak") return true;
      await upsertKeycloakUser((profile ?? user) as UpsertSource);
      return true;
    },
  },
});
