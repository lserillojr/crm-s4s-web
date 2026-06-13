import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

beforeEach(() => { vi.resetModules(); authMock.mockReset(); (global.fetch as any) = vi.fn(); });
afterEach(() => { vi.resetModules(); vi.restoreAllMocks(); });

async function loadRoute() {
  vi.doMock("@/lib/env", () => ({ env: { N8N_API_BASE_URL: "https://n8n.example", N8N_AI_SERVICE_TOKEN: "tok" } }));
  return import("@/app/api/kb/route");
}
const session = { user: { tenantId: "t-1", name: "João" } };

describe("GET /api/kb", () => {
  it("401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await loadRoute();
    expect((await GET(new Request("http://x") as any)).status).toBe(401);
  });
  it("sections null → inicializa do template (vertical)", async () => {
    authMock.mockResolvedValue(session);
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify({
      sections: null, sectionsPrevious: null, vertical: "outro", legacyContent: "Texto antigo", updatedAt: null,
    }), { status: 200 }));
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as any);
    const b = await res.json();
    expect(res.status).toBe(200);
    expect(b.sections).toHaveLength(9);
    expect(b.sections.find((s: any) => s.key === "identidade").content).toBe("Texto antigo");
    expect(b.hasPrevious).toBe(false);
  });
  it("WF falha → 502", async () => {
    authMock.mockResolvedValue(session);
    (global.fetch as any).mockResolvedValue(new Response("boom", { status: 500 }));
    const { GET } = await loadRoute();
    expect((await GET(new Request("http://x") as any)).status).toBe(502);
  });
});

describe("PUT /api/kb", () => {
  function req(body: any) {
    return new Request("http://x", { method: "PUT", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
  }
  it("400 quando bloco editável vem vazio", async () => {
    authMock.mockResolvedValue(session);
    const { PUT } = await loadRoute();
    expect((await PUT(req({ editable: { identidade: "   " } }) as any)).status).toBe(400);
  });

  it("aplica só editáveis, ignora travada, e salva (compose após funil-config)", async () => {
    authMock.mockResolvedValue(session);
    (global.fetch as any)
      // 1) kb get
      .mockResolvedValueOnce(new Response(JSON.stringify({
        sections: [
          { key: "identidade", title: "Identidade e tom", editable: true, content: "antigo" },
          { key: "regras_odoo", title: "Regras do funil", editable: false, content: "TRAVADO" },
        ],
        sectionsPrevious: null, vertical: "outro", legacyContent: "", updatedAt: null,
      }), { status: 200 }))
      // 2) funil-config get (sem placeholders no conteúdo → map irrelevante)
      .mockResolvedValueOnce(new Response(JSON.stringify({ stages: [] }), { status: 200 }))
      // 3) kb save
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, updatedAt: "2026-05-31T00:00:00Z" }), { status: 200 }));
    const { PUT } = await loadRoute();
    const res = await PUT(req({ editable: { identidade: "novo texto do mei", regras_odoo: "HACK" } }) as any);
    expect(res.status).toBe(200);
    const saveCall = (global.fetch as any).mock.calls[2];
    expect(String(saveCall[0])).toContain("/kb/api/v1/save");
    const sent = JSON.parse(saveCall[1].body);
    const odoo = sent.sections.find((s: any) => s.key === "regras_odoo");
    expect(odoo.content).toBe("TRAVADO");
    expect(sent.content).toContain("novo texto do mei");
  });

  it("resolve {{etapa:role}} no content salvo, mantendo as sections cruas", async () => {
    authMock.mockResolvedValue(session);
    (global.fetch as any)
      // 1) kb get — Seção 8 travada com placeholder cru
      .mockResolvedValueOnce(new Response(JSON.stringify({
        sections: [
          { key: "identidade", title: "Identidade e tom", editable: true, content: "id" },
          { key: "regras_odoo", title: "Regras do funil", editable: false, content: "mova para {{etapa:orcamento}}" },
        ],
        sectionsPrevious: null, vertical: "outro", legacyContent: "", updatedAt: null,
      }), { status: 200 }))
      // 2) funil-config get — orcamento renomeado para "Proposta"
      .mockResolvedValueOnce(new Response(JSON.stringify({
        stages: [{ s4s_role: "orcamento", name: "Proposta", sequence: 30 }],
      }), { status: 200 }))
      // 3) kb save
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, updatedAt: "2026-06-13T00:00:00Z" }), { status: 200 }));
    const { PUT } = await loadRoute();
    const res = await PUT(req({ editable: { identidade: "novo" } }) as any);
    expect(res.status).toBe(200);
    const sent = JSON.parse((global.fetch as any).mock.calls[2][1].body);
    // content (o que a IA lê) resolvido:
    expect(sent.content).toContain("mova para Proposta");
    expect(sent.content).not.toContain("{{etapa:orcamento}}");
    // sections (fonte editável) permanecem cruas, para re-resolver fresco no futuro:
    expect(sent.sections.find((s: any) => s.key === "regras_odoo").content).toBe(
      "mova para {{etapa:orcamento}}",
    );
  });

  it("funil-config indisponível → salva mesmo assim (200), placeholder vira vazio", async () => {
    authMock.mockResolvedValue(session);
    (global.fetch as any)
      // 1) kb get — Seção 8 com placeholder
      .mockResolvedValueOnce(new Response(JSON.stringify({
        sections: [
          { key: "identidade", title: "Identidade e tom", editable: true, content: "id" },
          { key: "regras_odoo", title: "Regras do funil", editable: false, content: "vai para {{etapa:orcamento}}!" },
        ],
        sectionsPrevious: null, vertical: "outro", legacyContent: "", updatedAt: null,
      }), { status: 200 }))
      // 2) funil-config get FALHA (502) → fetchRoleToName degrada para {}
      .mockResolvedValueOnce(new Response("boom", { status: 502 }))
      // 3) kb save
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, updatedAt: "2026-06-13T00:00:00Z" }), { status: 200 }));
    const { PUT } = await loadRoute();
    const res = await PUT(req({ editable: { identidade: "novo" } }) as any);
    expect(res.status).toBe(200);
    const sent = JSON.parse((global.fetch as any).mock.calls[2][1].body);
    // map vazio → papel desconhecido vira string vazia no content (degradação graciosa):
    expect(sent.content).toContain("vai para !");
    expect(sent.content).not.toContain("{{etapa:orcamento}}");
  });
});
