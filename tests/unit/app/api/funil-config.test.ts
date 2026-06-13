import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));
// Sem fallback de banco neste teste: garante tenantId pela sessão.
vi.mock("@/lib/auth/onboarding-guard", () => ({
  getTenantIdByEmail: vi.fn(async () => null),
}));

const VALID_SESSION = { user: { tenantId: "t-1", name: "João" } };

beforeEach(() => {
  vi.resetModules();
  authMock.mockReset();
  (global.fetch as unknown) = vi.fn();
});
afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

async function loadRoute(n8nBaseUrl: string | undefined = "https://n8n.example") {
  vi.doMock("@/lib/env", () => ({
    env: { N8N_API_BASE_URL: n8nBaseUrl, N8N_AI_SERVICE_TOKEN: "test-token" },
  }));
  return import("@/app/api/funil-config/route");
}

describe("GET /api/funil-config", () => {
  it("401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as never);
    expect(res.status).toBe(401);
  });

  it("monta etapas com significado e ordena por sequence", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          stages: [
            { s4s_role: "venda", name: "Matriculado", sequence: 60, is_won: true },
            { s4s_role: "novo", name: "Novo", sequence: 10, is_won: false },
          ],
        }),
        { status: 200 },
      ),
    );
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.loaded).toBe(true);
    expect(body.stages.map((s: { role: string }) => s.role)).toEqual(["novo", "venda"]);
    expect(body.stages[0].meaning).toBe("Cliente novo — acabou de chegar");
    expect(body.stages[0].editable).toBe(true);
    expect(body.stages[1].isWon).toBe(true);
  });

  it("WF erro → 200 degradado, stages vazio + loaded:false", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("boom", { status: 502 }),
    );
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.loaded).toBe(false);
    expect(body.stages).toEqual([]);
  });

  it("etapa sem s4s_role vira read-only (editable:false)", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ stages: [{ s4s_role: null, name: "Legado", sequence: 5 }] }),
        { status: 200 },
      ),
    );
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as never);
    const body = await res.json();
    expect(body.stages[0].editable).toBe(false);
    expect(body.stages[0].meaning).toBe("");
  });
});

describe("PUT /api/funil-config", () => {
  function putReq(body: unknown): Request {
    return new Request("http://x", { method: "PUT", body: JSON.stringify(body) });
  }

  it("401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { PUT } = await loadRoute();
    const res = await PUT(putReq({ renames: [{ role: "novo", name: "X" }] }) as never);
    expect(res.status).toBe(401);
  });

  it("400 body inválido (não chama o WF)", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    const { PUT } = await loadRoute();
    const res = await PUT(putReq({ renames: [{ role: "novo", name: "" }] }) as never);
    expect(res.status).toBe(400);
    expect(global.fetch as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it("200: repassa tenant_id + renames ao WF", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ ok: true, results: [{ role: "orcamento", ok: true }] }), {
        status: 200,
      }),
    );
    const { PUT } = await loadRoute();
    const res = await PUT(putReq({ renames: [{ role: "orcamento", name: "Proposta" }] }) as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toContain("/funil-config/api/v1/save");
    const sent = JSON.parse((init as { body: string }).body);
    expect(sent.tenant_id).toBe("t-1");
    expect(sent.renames).toEqual([{ role: "orcamento", name: "Proposta" }]);
  });

  it("WF falha → 502", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("boom", { status: 500 }));
    const { PUT } = await loadRoute();
    const res = await PUT(putReq({ renames: [{ role: "novo", name: "X" }] }) as never);
    expect(res.status).toBe(502);
  });

  it("propaga corpo do WF quando rename falha (ok:false + results)", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, results: [{ role: "orcamento", ok: false, error: "Já existe uma etapa com o nome Proposta" }] }),
        { status: 200 },
      ),
    );
    const { PUT } = await loadRoute();
    const res = await PUT(
      putReq({ renames: [{ role: "orcamento", name: "Proposta" }] }) as never,
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.results[0].error).toContain("Já existe");
  });
});
