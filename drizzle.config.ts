import type { Config } from "drizzle-kit";

/**
 * Config Drizzle CLI (introspect/migrate).
 *
 * Em SP2 fase 1 mantemos schema.ts à mão (sem introspect) porque DATABASE_URL real
 * só fica disponível em DEV/PROD. Quando precisar regenerar:
 *
 *   export DATABASE_URL='postgres://...'
 *   pnpm db:pull
 */
export default {
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  introspect: {
    casing: "preserve",
  },
} satisfies Config;
