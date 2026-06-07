/** Lookup de tenant pela conta Chatwoot. QueryRunner injetável (db/types). */
import type { QueryRunner } from "./types";

export async function getTenantIdByAccountId(client: QueryRunner, accountId: number): Promise<string | null> {
  const { rows } = await client.query(
    `SELECT id FROM tenants WHERE chatwoot_account_id = $1 LIMIT 1`,
    [accountId],
  );
  return rows[0] ? (rows[0].id as string) : null;
}

export async function getTenantChatwootCreds(
  client: QueryRunner,
  tenantId: string,
): Promise<{ accountId: number; apiToken: string } | null> {
  const { rows } = await client.query(
    `SELECT chatwoot_account_id, chatwoot_api_token FROM tenants WHERE id = $1`,
    [tenantId],
  );
  const row = rows[0];
  if (!row) return null;
  return { accountId: Number(row.chatwoot_account_id), apiToken: String(row.chatwoot_api_token) };
}
