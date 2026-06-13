import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const requireAppUser = vi.fn();
vi.mock("@/lib/api/require-app-user", () => ({ requireAppUser: (r: Request) => requireAppUser(r) }));

beforeEach(() => {
  vi.resetModules();
  requireAppUser.mockReset();
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
  return import("@/app/api/app/home/summary/route");
}

function req() { return new Request("http://x/api/app/home/summary"); }

const RELATORIO_OK = {
  period: { days: 1, from: "2026-06-12", to: "2026-06-12" },
  ia: { conversasAtendidas: 7, tempoRespostaSegundos: 40, foraHorario: 3 },
  agenda: { agendados: 2, faltas: null, remarcacoes: null },
  funil: { etapaTrava: null, motivoPerdaTop: null },
  pico: null,
  csat: null,
};

describe("GET /api/app/home/summary", () => {
  it("401 sem auth (não chama o WF)", async () => {
    requireAppUser.mockResolvedValue({ response: Response.json({ error: "unauth" }, { status: 401 }) });
    const { GET } = await loadRoute();
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect((global.fetch as any)).not.toHaveBeenCalled();
  });

  it("chama o WF11 com days:1 e devolve os 3 números mapeados", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t-1" });
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify(RELATORIO_OK), { status: 200 }));
    const { GET } = await loadRoute();
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ conversasAtendidas: 7, agendamentos: 2, foraHorario: 3 });
    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://n8n.example/relatorios/api/v1/summary");
    expect(JSON.parse(opts.body)).toEqual({ tenant_id: "t-1", days: 1 });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("502 quando o WF falha (não inventa zeros)", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t-1" });
    (global.fetch as any).mockResolvedValue(new Response("boom", { status: 500 }));
    const { GET } = await loadRoute();
    const res = await GET(req());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("upstream");
  });

  it("502 quando o WF devolve shape inválido (parse falha)", async () => {
    requireAppUser.mockResolvedValue({ userId: "u1", tenantId: "t-1" });
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify({ lixo: true }), { status: 200 }));
    const { GET } = await loadRoute();
    const res = await GET(req());
    expect(res.status).toBe(502);
  });
});
