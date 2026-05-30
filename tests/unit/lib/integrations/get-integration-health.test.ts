import { describe, it, expect, vi } from "vitest";
import { getIntegrationHealth } from "@/lib/integrations/get-integration-health";

function mockPool(row: Record<string, unknown> | null) {
  return {
    query: vi.fn().mockResolvedValue({
      rows: row ? [row] : [],
      rowCount: row ? 1 : 0,
    }),
  };
}

describe("getIntegrationHealth", () => {
  it("retorna shape vazio quando tenant não existe", async () => {
    const pool = mockPool(null);
    // pool é stub
    const result = await getIntegrationHealth(pool, "tenant-inexistente");
    expect(result.google.level).toBe("unconnected");
    expect(result.whatsapp.level).toBe("unconnected");
    expect(result.instagram.level).toBe("unavailable");
  });

  it("retorna shape correto quando tenant existe sem nada conectado", async () => {
    const pool = mockPool({
      google_calendar_id: null,
      has_refresh_token: false,
      gcal_revoked_at: null,
      gcal_last_used_at: null,
      evolution_instance: null,
      wa_status: null,
      wa_last_inbound_at: null,
    });
    // pool é stub
    const result = await getIntegrationHealth(pool, "tenant-novo");
    expect(result.google).toEqual({
      level: "unconnected",
      calendarId: null,
      revokedAt: null,
      lastUsedAt: null,
    });
    expect(result.whatsapp).toEqual({
      level: "unconnected",
      waStatus: null,
      instanceName: null,
      lastInboundAt: null,
    });
  });

  it("retorna level=ok quando Google e WA estão saudáveis e recentes", async () => {
    const now = new Date("2026-05-31T12:00:00Z");
    const fresh = new Date("2026-05-31T08:00:00Z");
    const pool = mockPool({
      google_calendar_id: "primary",
      has_refresh_token: true,
      gcal_revoked_at: null,
      gcal_last_used_at: fresh,
      evolution_instance: "tenant-abc",
      wa_status: "connected",
      wa_last_inbound_at: fresh,
    });
    // pool é stub
    const result = await getIntegrationHealth(pool, "tenant-ativo", now);
    expect(result.google.level).toBe("ok");
    expect(result.google.calendarId).toBe("primary");
    expect(result.whatsapp.level).toBe("ok");
    expect(result.whatsapp.instanceName).toBe("tenant-abc");
    expect(result.instagram.level).toBe("unavailable");
  });

  it("retorna error quando gcal_revoked_at presente", async () => {
    const pool = mockPool({
      google_calendar_id: "primary",
      has_refresh_token: true,
      gcal_revoked_at: new Date(),
      gcal_last_used_at: new Date(),
      evolution_instance: "abc",
      wa_status: "connected",
      wa_last_inbound_at: new Date(),
    });
    // pool é stub
    const result = await getIntegrationHealth(pool, "t");
    expect(result.google.level).toBe("error");
  });

  it("SELECT é executado com tenantId como parâmetro", async () => {
    const pool = mockPool(null);
    // pool é stub
    await getIntegrationHealth(pool, "tenant-X");
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ["tenant-X"]);
  });

  it("SELECT lê coluna evolution_instance (não instance_name — schema real DEV)", async () => {
    const pool = mockPool(null);
    // pool é stub
    await getIntegrationHealth(pool, "t");
    const firstCall = pool.query.mock.calls[0];
    const sql = (firstCall ? firstCall[0] : "") as string;
    expect(sql).toMatch(/evolution_instance/);
    expect(sql).not.toMatch(/\binstance_name\b/);
  });
});
