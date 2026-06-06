"use client";
import { useQuery } from "@tanstack/react-query";
import { agendaItemSchema, type AgendaList } from "@/lib/agenda/contract";

/**
 * Hook da tela /agenda. Busca os agendamentos/bloqueios do período [from, to)
 * e VALIDA a resposta contra o contrato Zod — se a forma fugir do contrato, o
 * parse lança e a tela cai no estado de erro. Espelha `useRelatoriosSummary`.
 */
async function fetchAgenda(from: string, to: string): Promise<AgendaList> {
  const res = await fetch(`/api/agenda/list?from=${from}&to=${to}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`agenda list ${res.status}`);
  return agendaItemSchema.parse(await res.json());
}

export function useAgenda(from: string, to: string) {
  return useQuery({
    queryKey: ["agenda-list", from, to],
    queryFn: () => fetchAgenda(from, to),
  });
}
