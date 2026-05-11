import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "./env";
import * as schema from "./schema";

/**
 * Cliente Drizzle singleton.
 *
 * Padrão singleton evita múltiplas conexões em dev HMR (cada salvamento de
 * arquivo recria módulos; sem cache global, vazaria pool).
 */
const globalForDb = globalThis as unknown as {
  dbClient?: ReturnType<typeof postgres>;
};

function makeClient() {
  // Em test mode pode não ter DATABASE_URL ainda; deixar erro lazy quando usar.
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não está definida. Configure .env.local antes de usar `db`."
    );
  }
  return postgres(url, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
}

const client = globalForDb.dbClient ?? makeClient();

if (env.NODE_ENV !== "production") {
  globalForDb.dbClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
