import { computeGoogleLevel, computeWhatsAppLevel, type IntegrationLevel } from "./compute-level";

interface QueryRunner {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number }>;
}

export type IntegrationHealth = {
  google: {
    level: IntegrationLevel;
    calendarId: string | null;
    revokedAt: Date | null;
    lastUsedAt: Date | null;
  };
  whatsapp: {
    level: IntegrationLevel;
    waStatus: string | null;
    instanceName: string | null;
    lastInboundAt: Date | null;
  };
  instagram: { level: "unavailable" };
};

const EMPTY_GOOGLE = {
  level: "unconnected" as IntegrationLevel,
  calendarId: null,
  revokedAt: null,
  lastUsedAt: null,
};
const EMPTY_WHATSAPP = {
  level: "unconnected" as IntegrationLevel,
  waStatus: null,
  instanceName: null,
  lastInboundAt: null,
};

export async function getIntegrationHealth(
  pool: QueryRunner,
  tenantId: string,
  now: Date = new Date()
): Promise<IntegrationHealth> {
  const { rows } = await pool.query(
    `SELECT
        google_calendar_id,
        google_calendar_refresh_token_enc IS NOT NULL AS has_refresh_token,
        gcal_revoked_at,
        gcal_last_used_at,
        evolution_instance,
        wa_status,
        wa_last_inbound_at
       FROM tenants
      WHERE id = $1`,
    [tenantId]
  );

  if (rows.length === 0) {
    return {
      google: EMPTY_GOOGLE,
      whatsapp: EMPTY_WHATSAPP,
      instagram: { level: "unavailable" },
    };
  }

  const row = rows[0] as Record<string, unknown>;
  const revokedAt = (row.gcal_revoked_at as Date | null) ?? null;
  const lastUsedAt = (row.gcal_last_used_at as Date | null) ?? null;
  const hasRefreshToken = Boolean(row.has_refresh_token);
  const calendarId = (row.google_calendar_id as string | null) ?? null;

  const waStatus = (row.wa_status as string | null) ?? null;
  const instanceName = (row.evolution_instance as string | null) ?? null;
  const lastInboundAt = (row.wa_last_inbound_at as Date | null) ?? null;

  return {
    google: {
      level: computeGoogleLevel({ gcalRevokedAt: revokedAt, gcalLastUsedAt: lastUsedAt, hasRefreshToken }, now),
      calendarId,
      revokedAt,
      lastUsedAt,
    },
    whatsapp: {
      level: computeWhatsAppLevel({ waStatus, instanceName, waLastInboundAt: lastInboundAt }, now),
      waStatus,
      instanceName,
      lastInboundAt,
    },
    instagram: { level: "unavailable" },
  };
}
