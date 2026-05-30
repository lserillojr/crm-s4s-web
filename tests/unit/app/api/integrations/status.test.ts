import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ getPool: () => ({ query: vi.fn() }) }));
vi.mock("@/lib/integrations/get-integration-health", () => ({
  getIntegrationHealth: vi.fn(),
}));

import { auth } from "@/auth";
import { getIntegrationHealth } from "@/lib/integrations/get-integration-health";
import { GET } from "@/app/api/integrations/status/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/api/integrations/status", () => {
  it("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new Request("http://test") as never);
    expect(res.status).toBe(401);
  });

  it("200 com shape IntegrationHealth", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t" } } as never);
    vi.mocked(getIntegrationHealth).mockResolvedValue({
      google: { level: "ok", calendarId: "primary", revokedAt: null, lastUsedAt: new Date() },
      whatsapp: { level: "ok", waStatus: "connected", instanceName: "abc", lastInboundAt: new Date() },
      instagram: { level: "unavailable" },
    });
    const res = await GET(new Request("http://test") as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.google.level).toBe("ok");
    expect(body.whatsapp.level).toBe("ok");
    expect(body.instagram.level).toBe("unavailable");
  });

  it("Cache-Control no-store (polling não deve cachear)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t" } } as never);
    vi.mocked(getIntegrationHealth).mockResolvedValue({
      google: { level: "unconnected", calendarId: null, revokedAt: null, lastUsedAt: null },
      whatsapp: { level: "unconnected", waStatus: null, instanceName: null, lastInboundAt: null },
      instagram: { level: "unavailable" },
    });
    const res = await GET(new Request("http://test") as never);
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
});
