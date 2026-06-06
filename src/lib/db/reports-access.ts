/**
 * Acesso aos Relatórios detalhados (aba "Detalhado" / Chatwoot Reports) por tenant.
 * QueryRunner injetável (pg.Pool em produção, mock no teste) — espelha gcal-tokens.ts.
 */
interface QueryRunner {
  query: (
    sql: string,
    params: unknown[],
  ) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number }>;
}

export interface TenantReportsAccess {
  reportsDetailedEnabled: boolean;
  chatwootAccountId: number | null;
}

export async function getTenantReportsAccess(
  client: QueryRunner,
  tenantId: string,
): Promise<TenantReportsAccess> {
  const { rows } = await client.query(
    `SELECT reports_detailed_enabled, chatwoot_account_id
       FROM tenants
      WHERE id = $1`,
    [tenantId],
  );
  const row = rows[0];
  if (row === undefined) {
    return { reportsDetailedEnabled: false, chatwootAccountId: null };
  }
  return {
    reportsDetailedEnabled: Boolean(row.reports_detailed_enabled),
    chatwootAccountId:
      row.chatwoot_account_id == null ? null : Number(row.chatwoot_account_id),
  };
}
