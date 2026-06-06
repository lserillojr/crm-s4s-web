/** CRUD da tabela device_tokens (ExpoPushToken por device). QueryRunner injetável
 *  (mesmo padrão de db/gcal-tokens.ts) — o caller passa getPool() em produção. */
import type { QueryRunner } from "./types";

export type Platform = "android" | "ios";

export async function upsertDeviceToken(
  client: QueryRunner,
  input: { userId: string; token: string; platform: Platform },
): Promise<void> {
  await client.query(
    `INSERT INTO device_tokens (user_id, token, platform, last_seen_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (token) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           platform = EXCLUDED.platform,
           last_seen_at = now()`,
    [input.userId, input.token, input.platform],
  );
}

export async function deleteDeviceToken(client: QueryRunner, token: string, userId: string): Promise<void> {
  await client.query(`DELETE FROM device_tokens WHERE token = $1 AND user_id = $2`, [token, userId]);
}

export async function deleteTokens(client: QueryRunner, tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  await client.query(`DELETE FROM device_tokens WHERE token = ANY($1)`, [tokens]);
}

export async function getTokensForTenantOwner(client: QueryRunner, tenantId: string): Promise<string[]> {
  const { rows } = await client.query(
    `SELECT dt.token
       FROM device_tokens dt
       JOIN users u ON u.id = dt.user_id
      WHERE u.tenant_id = $1 AND u.role = 'owner'`,
    [tenantId],
  );
  return rows.map((r) => r.token as string);
}
