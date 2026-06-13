import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  (global.fetch as unknown) = vi.fn();
});
afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

async function load() {
  vi.doMock("@/lib/env", () => ({
    env: { N8N_API_BASE_URL: "https://n8n.example", N8N_AI_SERVICE_TOKEN: "tok" },
  }));
  return import("@/lib/kb/recompose");
}

describe("recomposeAndSaveKb", () => {
  it("sections==null → não salva (sem KB materializado), só 1 fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ sections: null, vertical: "outro", legacyContent: "" }), { status: 200 }),
    );
    const { recomposeAndSaveKb } = await load();
    expect(await recomposeAndSaveKb("t-1")).toEqual({ recomposed: false });
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("sections presentes → resolve {{etapa:role}} e salva o content", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      // 1) kb get
      .mockResolvedValueOnce(new Response(JSON.stringify({
        sections: [{ key: "regras_odoo", title: "Regras do funil", editable: false, content: "vai p/ {{etapa:venda}}" }],
        vertical: "outro", legacyContent: "",
      }), { status: 200 }))
      // 2) funil-config get
      .mockResolvedValueOnce(new Response(JSON.stringify({
        stages: [{ s4s_role: "venda", name: "Venda Fechada", sequence: 60 }],
      }), { status: 200 }))
      // 3) kb save
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, updatedAt: "2026-06-13T00:00:00Z" }), { status: 200 }));
    const { recomposeAndSaveKb } = await load();
    expect(await recomposeAndSaveKb("t-1")).toEqual({ recomposed: true });
    const sent = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[2]![1]!.body as string);
    expect(sent.content).toContain("vai p/ Venda Fechada");
    expect(sent.content).not.toContain("{{etapa:venda}}");
  });

  it("kb get falha → não salva", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response("boom", { status: 502 }));
    const { recomposeAndSaveKb } = await load();
    expect(await recomposeAndSaveKb("t-1")).toEqual({ recomposed: false });
  });

  it("save falha → recomposed:false (best-effort)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        sections: [{ key: "regras_odoo", title: "Regras do funil", editable: false, content: "x" }],
        vertical: "outro", legacyContent: "",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ stages: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response("boom", { status: 500 }));
    const { recomposeAndSaveKb } = await load();
    expect(await recomposeAndSaveKb("t-1")).toEqual({ recomposed: false });
  });
});
