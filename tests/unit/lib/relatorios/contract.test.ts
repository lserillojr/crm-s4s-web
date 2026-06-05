import { describe, it, expect } from "vitest";
import { relatoriosSummarySchema } from "@/lib/relatorios/contract";

describe("relatoriosSummarySchema", () => {
  const valido = {
    period: { days: 30, from: "2026-05-05", to: "2026-06-04" },
    ia: { conversasAtendidas: 83, tempoRespostaSegundos: 12, foraHorario: 31 },
    agenda: { agendados: 14, faltas: 2, remarcacoes: 3 },
    funil: { etapaTrava: "Orçamento", motivoPerdaTop: "Preço" },
    pico: { diaSemana: "terça", faixaHorario: "19h-21h" },
    csat: null,
  };

  it("aceita um payload completo válido", () => {
    expect(relatoriosSummarySchema.parse(valido)).toEqual(valido);
  });

  it("aceita opcionais nulos (tenant novo / fase 2)", () => {
    const minimo = {
      ...valido,
      ia: { conversasAtendidas: 0, tempoRespostaSegundos: 0, foraHorario: null },
      funil: { etapaTrava: null, motivoPerdaTop: null },
      pico: null,
      csat: null,
    };
    expect(() => relatoriosSummarySchema.parse(minimo)).not.toThrow();
  });

  it("rejeita period ausente", () => {
    const { period, ...semPeriod } = valido;
    expect(() => relatoriosSummarySchema.parse(semPeriod)).toThrow();
  });
});
