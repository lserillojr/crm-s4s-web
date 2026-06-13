import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveStagePlaceholders } from "@/lib/kb/placeholders";

afterEach(() => vi.restoreAllMocks());

describe("resolveStagePlaceholders", () => {
  const map = { orcamento: "Proposta", venda: "Matriculado" };

  it("troca um placeholder pelo label do map", () => {
    expect(resolveStagePlaceholders("mova para {{etapa:orcamento}}", map)).toBe(
      "mova para Proposta",
    );
  });

  it("troca vários papéis distintos", () => {
    expect(
      resolveStagePlaceholders("{{etapa:orcamento}} então {{etapa:venda}}", map),
    ).toBe("Proposta então Matriculado");
  });

  it("tolera espaços dentro do placeholder", () => {
    expect(resolveStagePlaceholders("x {{ etapa:venda }} y", map)).toBe("x Matriculado y");
  });

  it("papel ausente no funil → vazio + warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveStagePlaceholders("vai para {{etapa:negociacao}}!", map)).toBe("vai para !");
    expect(warn).toHaveBeenCalledWith(
      "[kb] placeholder de papel ausente no funil",
      { role: "negociacao" },
    );
  });

  it("sem placeholder → string intacta", () => {
    expect(resolveStagePlaceholders("nenhum placeholder aqui", map)).toBe(
      "nenhum placeholder aqui",
    );
  });
});
