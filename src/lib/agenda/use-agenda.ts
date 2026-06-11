"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agendaItemSchema, type AgendaList, type BlockInput, type RescheduleInput, type CreateAppointmentInput } from "@/lib/agenda/contract";

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

// ---------------------------------------------------------------------------
// Mutations de escrita — Onda 2
// ---------------------------------------------------------------------------

/** Cria um bloqueio de horário. Invalida a query agenda-list após sucesso. */
export function useCreateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BlockInput) => {
      const res = await fetch("/api/agenda/blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`create block ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-list"] });
    },
  });
}

/** Remove um bloqueio existente. Invalida a query agenda-list após sucesso. */
export function useDeleteBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/agenda/blocks?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`delete block ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-list"] });
    },
  });
}

/** Cancela um agendamento. Invalida a query agenda-list após sucesso. */
export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/agenda/appointments/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`cancel appointment ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-list"] });
    },
  });
}

/** Cria um agendamento manual. Invalida a query agenda-list após sucesso.
 *  Lança Error com message "conflict" quando o horário está ocupado (409). */
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      const res = await fetch("/api/agenda/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.status === 409) throw new Error("conflict");
      if (!res.ok) throw new Error(`create appointment ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-list"] });
    },
  });
}

/** Remarca um agendamento para um novo slot. Invalida a query agenda-list após sucesso. */
export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newSlotIso }: { id: string } & RescheduleInput) => {
      const res = await fetch(
        `/api/agenda/appointments/${encodeURIComponent(id)}/reschedule`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ newSlotIso }),
        },
      );
      if (!res.ok) throw new Error(`reschedule appointment ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-list"] });
    },
  });
}
