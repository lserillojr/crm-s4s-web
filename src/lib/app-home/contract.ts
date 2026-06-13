import { z } from "zod";
import type { RelatoriosSummary } from "@/lib/relatorios/contract";

/**
 * Shape enxuto consumido pela Home do app ("A IA hoje"). Recorte de 3 números
 * do contrato congelado do WF11 (RelatoriosSummary) — "clientes novos" fica para
 * uma onda futura, quando o WF for estendido. foraHorario é nullable (tenant novo).
 */
export const appHomeSummarySchema = z.object({
  conversasAtendidas: z.number(),
  agendamentos: z.number(),
  foraHorario: z.number().nullable(),
});

export type AppHomeSummary = z.infer<typeof appHomeSummarySchema>;

export function toAppHomeSummary(r: RelatoriosSummary): AppHomeSummary {
  return {
    conversasAtendidas: r.ia.conversasAtendidas,
    agendamentos: r.agenda.agendados,
    foraHorario: r.ia.foraHorario,
  };
}
