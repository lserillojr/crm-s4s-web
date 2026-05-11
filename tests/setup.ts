import "@testing-library/jest-dom/vitest";

/**
 * Setup global pros testes Vitest.
 * - Define NODE_ENV=test pra `env.ts` aceitar DATABASE_URL ausente
 * - Define DATABASE_URL stub porque alguns módulos importam db cedo
 */
// process.env.NODE_ENV é readonly em TS — definir via Object.assign pra contornar
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL:
    process.env.DATABASE_URL ?? "postgres://test:test@localhost:5432/test",
});
