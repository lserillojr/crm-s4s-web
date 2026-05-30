import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { poolQuery } = vi.hoisted(() => ({ poolQuery: vi.fn() }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ getPool: () => ({ query: poolQuery }) }));
vi.mock("@/lib/config/global-config", () => ({
  getRequiredGlobalConfig: vi.fn(),
}));

import { auth } from "@/auth";
import { getRequiredGlobalConfig } from "@/lib/config/global-config";
import { GET } from "@/app/api/whatsapp/qr/route";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  poolQuery.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("/api/whatsapp/qr", () => {
  it("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new Request("http://test/api/whatsapp/qr") as never);
    expect(res.status).toBe(401);
  });

  it("500 quando evolution_instance é NULL", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "tenant-A" } } as never);
    poolQuery.mockResolvedValue({ rows: [{ evolution_instance: null }], rowCount: 1 });
    vi.mocked(getRequiredGlobalConfig).mockResolvedValue("https://evo");
    const res = await GET(new Request("http://test/api/whatsapp/qr") as never);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("no_instance_provisioned");
  });

  it("200 com qrcode + pairingCode quando Evolution responde OK", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "tenant-A" } } as never);
    poolQuery.mockResolvedValue({ rows: [{ evolution_instance: "tenant-abc" }], rowCount: 1 });
    vi.mocked(getRequiredGlobalConfig)
      .mockResolvedValueOnce("https://evo.example.com")
      .mockResolvedValueOnce("evo-key-xyz");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ code: "ABCD-1234", base64: "data:image/png;base64,iVBORw0K..." }),
    });
    const res = await GET(new Request("http://test/api/whatsapp/qr") as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.qrcode).toContain("data:image/png");
    expect(body.pairingCode).toBe("ABCD-1234");
    expect(body.expiresInSeconds).toBe(60);
  });

  it("503 evolution_unreachable quando Evolution 5xx", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "tenant-A" } } as never);
    poolQuery.mockResolvedValue({ rows: [{ evolution_instance: "tenant-abc" }], rowCount: 1 });
    vi.mocked(getRequiredGlobalConfig)
      .mockResolvedValueOnce("https://evo")
      .mockResolvedValueOnce("key");
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });
    const res = await GET(new Request("http://test/api/whatsapp/qr") as never);
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.error).toBe("evolution_unreachable");
  });

  it("503 instance_missing quando Evolution 404", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "tenant-A" } } as never);
    poolQuery.mockResolvedValue({ rows: [{ evolution_instance: "tenant-abc" }], rowCount: 1 });
    vi.mocked(getRequiredGlobalConfig)
      .mockResolvedValueOnce("https://evo")
      .mockResolvedValueOnce("key");
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });
    const res = await GET(new Request("http://test/api/whatsapp/qr") as never);
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.error).toBe("instance_missing");
  });

  it("usa key evolution_api_base_url (não evolution_api_url) no global_config", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "tenant-A" } } as never);
    poolQuery.mockResolvedValue({ rows: [{ evolution_instance: "abc" }], rowCount: 1 });
    vi.mocked(getRequiredGlobalConfig)
      .mockResolvedValueOnce("https://evo")
      .mockResolvedValueOnce("key");
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({ code: "X", base64: "y" }),
    });
    await GET(new Request("http://test/api/whatsapp/qr") as never);
    const calls = vi.mocked(getRequiredGlobalConfig).mock.calls.map((c) => c[1]);
    expect(calls).toContain("evolution_api_base_url");
    expect(calls).toContain("evolution_api_key");
  });
});
