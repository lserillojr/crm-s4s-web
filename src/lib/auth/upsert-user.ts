import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

/**
 * Claims relevantes pro sync de user vindos do Keycloak (profile OIDC) ou,
 * no seam de teste, do objeto `user` do provider mock.
 */
export interface UpsertSource {
  email?: string | null;
  name?: string | null;
  preferred_username?: string | null;
  phone_number?: string | null;
}

export interface UserFields {
  email: string;
  name: string | null;
  phoneNumber: string | null;
}

/**
 * Mapeamento puro profile → colunas de `users`. Retorna `null` quando não há
 * email — sem ele não há chave de identidade (a tabela não guarda o `sub` do
 * Keycloak; a unicidade é `lower(email)`).
 */
export function userFieldsFromProfile(source?: UpsertSource): UserFields | null {
  const email = source?.email?.trim();
  if (!email) return null;
  return {
    email,
    name: source?.name?.trim() || source?.preferred_username?.trim() || null,
    phoneNumber: source?.phone_number?.trim() || null,
  };
}

/**
 * Upsert app-side do user autenticado pelo Keycloak (decisão 6d: sync no
 * callback do Auth.js, não via webhook/WF16). Garante uma row local em `users`
 * keyed por `lower(email)` (índice único `idx_users_email_lower`).
 *
 * Preserva `tenant_id` e `role` (vínculo de tenant é feito pelo wizard, não
 * aqui); só atualiza identidade + `last_login_at`. Fail-closed: lança se não
 * houver email, abortando o login (o caller é o callback `signIn`).
 */
export async function upsertKeycloakUser(source?: UpsertSource): Promise<void> {
  const fields = userFieldsFromProfile(source);
  if (!fields) {
    throw new Error("upsertKeycloakUser: profile sem email — sync abortado");
  }
  await db.execute(sql`
    INSERT INTO users (email, name, phone_number, auth_managed_by, last_login_at, updated_at)
    VALUES (${fields.email}, ${fields.name}, ${fields.phoneNumber}, 'keycloak', now(), now())
    ON CONFLICT (lower(email)) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, users.name),
      phone_number = COALESCE(EXCLUDED.phone_number, users.phone_number),
      auth_managed_by = 'keycloak',
      last_login_at = now(),
      updated_at = now()
  `);
}
