import { describe, it, expect } from "vitest";
import {
  fraseConversas,
  fraseTempoResposta,
  fraseAgendados,
  fraseOndeTrava,
  fraseForaHorario,
  frasePico,
} from "@/lib/relatorios/frases";

describe("frases MEI", () => {
  it("conversas: usa o número e fala em 'clientes'", () => {
    expect(fraseConversas(83)).toBe("A IA atendeu 83 clientes pra você");
  });

  it("conversas: singular quando 1", () => {
    expect(fraseConversas(1)).toBe("A IA atendeu 1 cliente pra você");
  });

  it("tempo de resposta em segundos quando < 60", () => {
    expect(fraseTempoResposta(12)).toBe("Seus clientes esperaram só 12 segundos");
  });

  it("tempo de resposta em minutos quando >= 60", () => {
    expect(fraseTempoResposta(150)).toBe("Seus clientes esperaram só 2,5 minutos");
  });

  it("tempo de resposta: singular '1 minuto' no limite de 60s", () => {
    expect(fraseTempoResposta(60)).toBe("Seus clientes esperaram só 1 minuto");
  });

  it("tempo de resposta: singular '1 segundo'", () => {
    expect(fraseTempoResposta(1)).toBe("Seus clientes esperaram só 1 segundo");
  });

  it("agendados fala em 'horários'", () => {
    expect(fraseAgendados(14)).toBe("A IA marcou 14 horários na sua agenda");
  });

  it("onde trava: estado vazio amigável quando null", () => {
    expect(fraseOndeTrava(null, null)).toBe("Ainda sem dados suficientes do funil");
  });

  it("onde trava: etapa + motivo quando há dados", () => {
    expect(fraseOndeTrava("Orçamento", "Preço")).toBe(
      'A maioria para em "Orçamento" — motivo nº1: Preço',
    );
  });

  it("fora do horário: plural", () => {
    expect(fraseForaHorario(31)).toBe(
      "31 clientes atendidos fora do expediente",
    );
  });

  it("fora do horário: singular quando 1", () => {
    expect(fraseForaHorario(1)).toBe("1 cliente atendido fora do expediente");
  });

  it("pico: dia da semana + faixa quando há dado", () => {
    expect(frasePico({ diaSemana: "terça", faixaHorario: "19h–21h" })).toBe(
      "Seu pico é terça, 19h–21h",
    );
  });

  it("pico: estado vazio amigável quando null", () => {
    expect(frasePico(null)).toBe(
      "Ainda sem movimento suficiente pra apontar um padrão",
    );
  });
});
