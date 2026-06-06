/** Lookup de tenant pela conta Chatwoot. QueryRunner injetável (db/types). */
import type { QueryRunner } from "./types";

export async function getTenantIdByAccountId(client: QueryRunner, accountId: number): Promise<string | null> {
  const { rows } = await client.query(
    `SELECT id FROM tenants WHERE chatwoot_account_id = $1 LIMIT 1`,
    [accountId],
  );
  return rows[0] ? (rows[0].id as string) : null;
}
