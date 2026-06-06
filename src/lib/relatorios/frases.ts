/**
 * Funções puras que convertem cada número curado numa frase em linguagem MEI.
 * Responsabilidade: apresentação/linguagem (sem jargão). Testável isoladamente.
 * Ver spec 2026-06-04-relatorios-mei-design.md §3.
 */
import type { RelatoriosSummary } from "./contract";
export function fraseConversas(n: number): string {
  const cliente = n === 1 ? "cliente" : "clientes";
  return `A IA atendeu ${n} ${cliente} pra você`;
}

export function fraseTempoResposta(segundos: number): string {
  if (segundos < 60) {
    const unidade = segundos === 1 ? "segundo" : "segundos";
    return `Seus clientes esperaram só ${segundos} ${unidade}`;
  }
  const min = (segundos / 60).toFixed(1).replace(".", ",").replace(",0", "");
  const unidade = min === "1" ? "minuto" : "minutos";
  return `Seus clientes esperaram só ${min} ${unidade}`;
}

export function fraseAgendados(n: number): string {
  return `A IA marcou ${n} horários na sua agenda`;
}

export function fraseOndeTrava(
  etapa: string | null,
  motivo: string | null,
): string {
  if (!etapa) return "Ainda sem dados suficientes do funil";
  const m = motivo ? ` — motivo nº1: ${motivo}` : "";
  return `A maioria para em "${etapa}"${m}`;
}

export function fraseForaHorario(n: number): string {
  const s = n === 1 ? "cliente atendido" : "clientes atendidos";
  return `${n} ${s} fora do expediente`;
}

export function frasePico(pico: RelatoriosSummary["pico"]): string {
  if (!pico) return "Ainda sem movimento suficiente pra apontar um padrão";
  return `Seu pico é ${pico.diaSemana}, ${pico.faixaHorario}`;
}
