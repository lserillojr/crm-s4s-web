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
});
