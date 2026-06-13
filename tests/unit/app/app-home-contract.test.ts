import { describe, it, expect } from "vitest";
import { toAppHomeSummary, appHomeSummarySchema } from "@/lib/app-home/contract";
import type { RelatoriosSummary } from "@/lib/relatorios/contract";

function relatorio(over: Partial<RelatoriosSummary> = {}): RelatoriosSummary {
  return {
    period: { days: 1, from: "2026-06-12", to: "2026-06-12" },
    ia: { conversasAtendidas: 7, tempoRespostaSegundos: 40, foraHorario: 3 },
    agenda: { agendados: 2, faltas: null, remarcacoes: null },
    funil: { etapaTrava: null, motivoPerdaTop: null },
    pico: null,
    csat: null,
    ...over,
  };
}

describe("toAppHomeSummary", () => {
  it("mapeia os 3 números do contrato do WF11", () => {
    expect(toAppHomeSummary(relatorio())).toEqual({
      conversasAtendidas: 7,
      agendamentos: 2,
      foraHorario: 3,
    });
  });

  it("preserva foraHorario null (tenant novo / fase 2)", () => {
    const out = toAppHomeSummary(relatorio({ ia: { conversasAtendidas: 0, tempoRespostaSegundos: 0, foraHorario: null } }));
    expect(out.foraHorario).toBeNull();
  });

  it("o schema valida a saída do mapper", () => {
    expect(() => appHomeSummarySchema.parse(toAppHomeSummary(relatorio()))).not.toThrow();
  });
});
