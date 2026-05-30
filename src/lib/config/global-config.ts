interface QueryRunner {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number }>;
}

export async function getGlobalConfig(pool: QueryRunner, key: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT value FROM global_config WHERE key = $1`, [key]);
  if (rows.length === 0) return null;
  return (rows[0].value as string | null) ?? null;
}

export async function getRequiredGlobalConfig(pool: QueryRunner, key: string): Promise<string> {
  const v = await getGlobalConfig(pool, key);
  if (v === null) {
    throw new Error(`global_config: chave '${key}' ausente ou nula`);
  }
  return v;
}
