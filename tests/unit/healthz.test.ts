import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testa o handler GET /api/healthz.
 *
 * Mockamos `@/lib/db` para não conectar ao Postgres real. Dois cenários:
 * - db.execute resolve OK -> 200 + status:"ok"
 * - db.execute rejeita    -> 503 + status:"degraded" + errors
 */

describe("GET /api/healthz", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("retorna 200 com db ok", async () => {
    vi.doMock("@/lib/db", () => ({
      db: { execute: vi.fn().mockResolvedValue([{ ok: 1 }]) },
    }));
    const { GET } = await import("@/app/api/healthz/route");
    const resp = await GET();
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe("ok");
    expect(body.checks.db).toBe("ok");
    expect(body.errors).toBeUndefined();
  });

  it("retorna 503 com db error e mensagem em errors[]", async () => {
    vi.doMock("@/lib/db", () => ({
      db: {
        execute: vi.fn().mockRejectedValue(new Error("connection refused")),
      },
    }));
    const { GET } = await import("@/app/api/healthz/route");
    const resp = await GET();
    expect(resp.status).toBe(503);
    const body = await resp.json();
    expect(body.status).toBe("degraded");
    expect(body.checks.db).toBe("error");
    expect(body.errors).toEqual(["db: connection refused"]);
  });
});
