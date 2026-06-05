import { describe, it, expect } from "vitest";
import {
  fraseConversas,
  fraseTempoResposta,
  fraseAgendados,
  fraseOndeTrava,
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
});
