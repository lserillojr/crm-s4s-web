import { describe, it, expect } from "vitest";
import { meaningForRole, ROLE_ORDER, ROLE_MEANINGS } from "@/lib/funil/roles";

describe("roles", () => {
  it("dá significado em linguagem de MEI para um papel conhecido", () => {
    expect(meaningForRole("orcamento")).toBe(ROLE_MEANINGS.orcamento);
    expect(meaningForRole("orcamento").length).toBeGreaterThan(0);
  });

  it("devolve string vazia para papel desconhecido ou nulo", () => {
    expect(meaningForRole("inexistente")).toBe("");
    expect(meaningForRole(null)).toBe("");
    expect(meaningForRole(undefined)).toBe("");
  });

  it("cobre os 9 papéis do funil oficial na ordem", () => {
    expect(ROLE_ORDER).toEqual([
      "novo", "em_contato", "orcamento", "agendado", "reagendado",
      "negociacao", "venda", "aguardando", "perdido",
    ]);
    for (const role of ROLE_ORDER) {
      expect(ROLE_MEANINGS[role]).toBeTruthy();
    }
  });
});
