import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Decide se um usuário AUTENTICADO deve ser mandado de volta ao onboarding.
 *
 * O `tenantId` da sessão pode estar defasado logo após o provisionamento: o JWT
 * é cunhado no login, ANTES de o claim `tenant_id` existir no Keycloak, e o
 * Auth.js só recopia claims num novo sign-in. Por isso a decisão consulta DUAS
 * fontes — o token (rápido) e o banco (autoritativo) — e só redireciona quando
 * AMBAS indicam ausência de tenant, ou seja, o cadastro nunca foi finalizado
 * (o provisionamento jamais rodou). Assim o caminho feliz pós-provisionamento
 * (token defasado, banco já com tenant) NÃO é jogado de volta ao wizard.
 */
export function needsOnboarding(opts: {
  sessionTenantId: string | null | undefined;
  dbTenantId: string | null | undefined;
}): boolean {
  if (opts.sessionTenantId) return false;
  if (opts.dbTenantId) return false;
  return true;
}

/**
 * Lê o `tenant_id` autoritativo do user (keyed por lower(email)). null se o user
 * não existe ou ainda não tem tenant. Espelha o padrão de `getOnboardingState`.
 */
export async function getTenantIdByEmail(
  email: string | null | undefined,
): Promise<string | null> {
  const key = email?.trim();
  if (!key) return null;
  const rows = (await db.execute(sql`
    SELECT tenant_id FROM users WHERE lower(email) = lower(${key}) LIMIT 1
  `)) as unknown as Array<{ tenant_id: string | null }>;
  return rows[0]?.tenant_id ?? null;
}
