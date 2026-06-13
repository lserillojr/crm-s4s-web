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
  return import("@/lib/funil/role-to-name");
}

describe("fetchRoleToName", () => {
  it("monta map papel→nome, ignora s4s_role null e mantém o primeiro em papel duplicado", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          stages: [
            { s4s_role: "orcamento", name: "Em Orçamento", sequence: 30 },
            { s4s_role: null, name: "Legado", sequence: 5 },
            { s4s_role: "orcamento", name: "Duplicado", sequence: 31 },
            { s4s_role: "venda", name: "Matriculado", sequence: 60, is_won: true },
          ],
        }),
        { status: 200 },
      ),
    );
    const { fetchRoleToName } = await load();
    expect(await fetchRoleToName("t-1")).toEqual({
      orcamento: "Em Orçamento",
      venda: "Matriculado",
    });
  });

  it("WF indisponível → map vazio + warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("boom", { status: 502 }));
    const { fetchRoleToName } = await load();
    expect(await fetchRoleToName("t-1")).toEqual({});
    expect(warn).toHaveBeenCalled();
  });

  it("shape inválido → map vazio", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ wrong: true }), { status: 200 }),
    );
    const { fetchRoleToName } = await load();
    expect(await fetchRoleToName("t-1")).toEqual({});
  });
});
