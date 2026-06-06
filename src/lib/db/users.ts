/** Lookup de usuário autenticável por email (chave estável: realm s4s usa email
 *  como username; users não tem coluna sub). QueryRunner injetável. */
import type { QueryRunner } from "./types";

export async function getAppUserByEmail(
  client: QueryRunner,
  email: string,
): Promise<{ userId: string; tenantId: string | null } | null> {
  const { rows } = await client.query(
    `SELECT id, tenant_id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  );
  const row = rows[0];
  if (!row) return null;
  return { userId: row.id as string, tenantId: (row.tenant_id as string | null) ?? null };
}
