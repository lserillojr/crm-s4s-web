import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

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
  // Rotas Story 7.8 (start/callback OAuth Google) chamam getOrigin(req) que tenta
  // process.env.AUTH_URL ?? req.nextUrl.origin. Os testes passam Request cru (sem
  // .nextUrl) — precisamos do AUTH_URL stub aqui pra evitar TypeError.
  AUTH_URL: process.env.AUTH_URL ?? "https://app.example.com",
});
