/** Cliente de query injetável (pg Pool em prod, mock client em teste). Tipo único
 *  compartilhado pelas libs de db desta feature, evitando redeclaração por arquivo. */
export interface QueryRunner {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number }>;
}
