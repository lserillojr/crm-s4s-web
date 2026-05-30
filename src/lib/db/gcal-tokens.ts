/**
 * CRUD do refresh_token Google Calendar criptografado via pgcrypto.
 * Token NUNCA sai do banco em plaintext fora dos workflows n8n que precisam usar.
 */

interface QueryRunner {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number }>;
}

export interface SaveTokenInput {
  tenantId: string;
  refreshToken: string;
  calendarId: string;
  calendarName?: string;
  encryptionKey: string;
}

export async function saveEncryptedToken(client: QueryRunner, input: SaveTokenInput): Promise<void> {
  await client.query(
    `UPDATE tenants
        SET google_calendar_refresh_token_enc = pgp_sym_encrypt($1, $2),
            google_calendar_id = $3,
            gcal_revoked_at = NULL,
            updated_at = NOW()
      WHERE id = $4`,
    [input.refreshToken, input.encryptionKey, input.calendarId, input.tenantId]
  );
}

export async function clearTokenAndRevokedAt(client: QueryRunner, tenantId: string): Promise<void> {
  await client.query(
    `UPDATE tenants
        SET google_calendar_refresh_token_enc = NULL,
            gcal_revoked_at = NULL,
            updated_at = NOW()
      WHERE id = $1`,
    [tenantId]
  );
}

export interface TenantCalendarInfo {
  calendarId: string | null;
  connected: boolean;
  revoked: boolean;
}

export async function getTenantCalendarInfo(client: QueryRunner, tenantId: string): Promise<TenantCalendarInfo> {
  const { rows } = await client.query(
    `SELECT google_calendar_id,
            google_calendar_refresh_token_enc IS NOT NULL AS has_token,
            gcal_revoked_at
       FROM tenants
      WHERE id = $1`,
    [tenantId]
  );
  const row = rows[0];
  if (row === undefined) return { calendarId: null, connected: false, revoked: false };
  return {
    calendarId: (row.google_calendar_id as string | null) ?? null,
    connected: Boolean(row.has_token),
    revoked: row.gcal_revoked_at != null,
  };
}
