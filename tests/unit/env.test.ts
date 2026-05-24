import { describe, it, expect } from "vitest";

/**
 * Smoke test do parse de env vars. Garante que com DATABASE_URL setado
 * no setup, módulo `env` carrega sem throw.
 */
describe("lib/env", () => {
  it("parse com DATABASE_URL stub do setup carrega sem erro", async () => {
    const mod = await import("@/lib/env");
    expect(mod.env).toBeDefined();
    expect(mod.env.NODE_ENV).toBe("test");
  });

  it("DATABASE_URL stub presente após setup", () => {
    expect(process.env.DATABASE_URL).toMatch(/^postgres:\/\//);
  });

  it("string vazia em var url opcional vira undefined (não lança ZodError)", async () => {
    const { parseEnvFrom } = await import("@/lib/env");
    // Simula `${VAR:-}` do compose entregando "" — antes quebrava z.url()
    const out = parseEnvFrom({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://u:p@h:5432/d",
      AUTH_KEYCLOAK_ISSUER: "",
      N8N_API_BASE_URL: "",
      RESEND_API_KEY: "",
    });
    expect(out.AUTH_KEYCLOAK_ISSUER).toBeUndefined();
    expect(out.N8N_API_BASE_URL).toBeUndefined();
  });
});
