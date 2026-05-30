import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/gcal-tokens", () => ({
  getTenantCalendarInfo: vi.fn(),
}));
vi.mock("@/lib/db/pool", () => ({
  getPool: vi.fn(() => ({ query: vi.fn() })),
}));

import { GET } from "@/app/api/tenant/me/route";
import { auth } from "@/auth";
import { getTenantCalendarInfo } from "@/lib/db/gcal-tokens";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/tenant/me", () => {
  it("401 quando não há sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new Request("https://app.example.com/api/tenant/me") as never);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauth" });
  });

  it("401 quando sessão não tem tenantId", async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);
    const res = await GET(new Request("https://app.example.com/api/tenant/me") as never);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauth" });
  });

  it("200 com info do calendar quando autenticado", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t-1" } } as never);
    vi.mocked(getTenantCalendarInfo).mockResolvedValue({
      calendarId: "primary",
      connected: true,
      revoked: false,
    });
    const res = await GET(new Request("https://app.example.com/api/tenant/me") as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      calendarId: "primary",
      connected: true,
      revoked: false,
    });
  });
});
