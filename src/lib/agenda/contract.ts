import { z } from "zod";

/**
 * Contrato da tela /agenda (Onda 1 — só-leitura). O route handler
 * `/api/agenda/list` lê os nossos `appointments`/`availability_blocks`
 * (isolados por tenant) e devolve exatamente esta forma; a tela a consome.
 * Espelha o JSON do endpoint canônico do módulo agenda (crm-s4s-ai).
 * Ver spec 2026-06-05-arquitetura-agenda-google-opcional-design.md §7.
 */
export const agendaItemSchema = z.object({
  appointments: z.array(
    z.object({
      id: z.string(),
      start: z.string(),
      end: z.string(),
      contactName: z.string().nullable(),
      status: z.string(),
      source: z.string(),
    }),
  ),
  blocks: z.array(
    z.object({
      id: z.string(),
      start: z.string(),
      end: z.string(),
      reason: z.string().nullable(),
    }),
  ),
});

export type AgendaList = z.infer<typeof agendaItemSchema>;

/**
 * Schemas de escrita — Onda 2.
 *
 * BlockInput   : corpo do POST /api/agenda/blocks
 * RescheduleInput : corpo do POST /api/agenda/appointments/[id]/reschedule
 */
// `{ offset: true }`: os forms (block-form / reschedule inline) convertem o input
// datetime-local para ISO com offset local explícito (ex.: "...-03:00"), nunca 'Z'.
// O default do z.datetime() só aceita 'Z' e rejeitaria o próprio input dos forms —
// quebrando criar-bloqueio e reagendar em qualquer fuso. O backend (crm-s4s-ai)
// aceita offset. (Bug latente da Onda 2, exposto pelos e2e da Onda 3.)
export const BlockInput = z.object({
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  reason: z.string().max(120).optional(),
});
export type BlockInput = z.infer<typeof BlockInput>;

export const RescheduleInput = z.object({
  newSlotIso: z.string().datetime({ offset: true }),
});
export type RescheduleInput = z.infer<typeof RescheduleInput>;
