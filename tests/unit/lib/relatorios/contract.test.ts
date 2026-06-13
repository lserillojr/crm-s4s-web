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

  it("aceita Venda Fechada + faturamento no bloco funil", () => {
    const comVendas = {
      ...valido,
      funil: { etapaTrava: "Orçamento", motivoPerdaTop: "Preço", vendaFechadaCount: 3, faturamentoBrl: 4480 },
    };
    const parsed = relatoriosSummarySchema.parse(comVendas);
    expect(parsed.funil.vendaFechadaCount).toBe(3);
    expect(parsed.funil.faturamentoBrl).toBe(4480);
  });

  it("trata Venda Fechada/faturamento como opcionais (WF antigo / tenant sem o role)", () => {
    // payload sem os campos novos continua válido (compatibilidade de rollout)
    expect(() => relatoriosSummarySchema.parse(valido)).not.toThrow();
    const comNulos = {
      ...valido,
      funil: { etapaTrava: null, motivoPerdaTop: null, vendaFechadaCount: null, faturamentoBrl: null },
    };
    expect(() => relatoriosSummarySchema.parse(comNulos)).not.toThrow();
  });
});
