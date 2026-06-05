import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

beforeEach(() => {
  vi.resetModules();
  authMock.mockReset();
  (global.fetch as any) = vi.fn();
});
afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

async function loadRoute(n8nBaseUrl: string | undefined = "https://n8n.example") {
  vi.doMock("@/lib/env", () => ({
    env: { N8N_API_BASE_URL: n8nBaseUrl, N8N_AI_SERVICE_TOKEN: "test-token" },
  }));
  return import("@/app/api/relatorios/summary/route");
}

function sessaoComTenant() {
  authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
}

describe("GET /api/relatorios/summary", () => {
  it("401 sem sessão (não chama o WF)", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x/api/relatorios/summary"));
    expect(res.status).toBe(401);
    expect((global.fetch as any)).not.toHaveBeenCalled();
  });

  it("repassa days e tenant ao WF e devolve o JSON do contrato", async () => {
    sessaoComTenant();
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const { GET } = await loadRoute();
    const res = await GET(
      new Request("http://x/api/relatorios/summary?days=7"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://n8n.example/relatorios/api/v1/summary");
    expect(JSON.parse(opts.body)).toEqual({ tenant_id: "t-1", days: 7 });
  });

  it("default days=30 quando ausente", async () => {
    sessaoComTenant();
    (global.fetch as any).mockResolvedValue(new Response("{}", { status: 200 }));
    const { GET } = await loadRoute();
    await GET(new Request("http://x/api/relatorios/summary"));
    const [, opts] = (global.fetch as any).mock.calls[0];
    expect(JSON.parse(opts.body).days).toBe(30);
  });

  it("clampa days inválido para 30 (seletor só oferece 7/30)", async () => {
    sessaoComTenant();
    (global.fetch as any).mockResolvedValue(new Response("{}", { status: 200 }));
    const { GET } = await loadRoute();
    await GET(new Request("http://x/api/relatorios/summary?days=999"));
    const [, opts] = (global.fetch as any).mock.calls[0];
    expect(JSON.parse(opts.body).days).toBe(30);
  });

  it("WF erro → 502 (não inventa zeros enganosos)", async () => {
    sessaoComTenant();
    (global.fetch as any).mockResolvedValue(new Response("boom", { status: 500 }));
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x/api/relatorios/summary"));
    expect(res.status).toBe(502);
  });
});
