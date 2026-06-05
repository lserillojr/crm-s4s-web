import { z } from "zod";

/**
 * Contrato congelado do painel "Resumo" dos Relatórios do MEI (Ag-1b).
 * O WF n8n "Relatórios — Resumo" produz exatamente esta forma; a tela
 * `/relatorios` a consome. Opcionais nulos cobrem tenant novo / fase 2
 * (foraHorario/pico/csat). Ver spec 2026-06-04-relatorios-mei-design.md §3.
 */
export const relatoriosSummarySchema = z.object({
  period: z.object({
    days: z.number(),
    from: z.string(),
    to: z.string(),
  }),
  ia: z.object({
    conversasAtendidas: z.number(),
    tempoRespostaSegundos: z.number(),
    foraHorario: z.number().nullable(),
  }),
  agenda: z.object({
    agendados: z.number(),
    faltas: z.number().nullable(),
    remarcacoes: z.number().nullable(),
  }),
  funil: z.object({
    etapaTrava: z.string().nullable(),
    motivoPerdaTop: z.string().nullable(),
  }),
  pico: z
    .object({ diaSemana: z.string(), faixaHorario: z.string() })
    .nullable(),
  csat: z.number().nullable(),
});

export type RelatoriosSummary = z.infer<typeof relatoriosSummarySchema>;
