"use client";
import { useQuery } from "@tanstack/react-query";
import {
  relatoriosSummarySchema,
  type RelatoriosSummary,
} from "@/lib/relatorios/contract";

/**
 * Hook do painel "Resumo", parametrizado pelo período (7/30 dias). Espelha
 * `useDashboardSummary` (7.5), mas valida a resposta contra o contrato Zod — se o
 * WF devolver um shape fora do contrato, o parse lança e a tela mostra estado de erro.
 */
async function fetchRelatorios(days: number): Promise<RelatoriosSummary> {
  const res = await fetch(`/api/relatorios/summary?days=${days}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`relatorios summary ${res.status}`);
  return relatoriosSummarySchema.parse(await res.json());
}

export function useRelatoriosSummary(days: number) {
  return useQuery({
    queryKey: ["relatorios-summary", days],
    queryFn: () => fetchRelatorios(days),
  });
}
