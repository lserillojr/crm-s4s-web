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
      title: z.string().nullable().optional(),
      meetLink: z.string().nullable().optional(),
      contactEmail: z.string().nullable().optional(),
      contactPhone: z.string().nullable().optional(),
      odooPartnerId: z.number().nullable().optional(),
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

/**
 * Schema de criação de agendamento manual — corpo do POST /api/agenda/appointments.
 * `startIso` com offset local explícito (mesma regra de BlockInput/RescheduleInput).
 */
export const CreateAppointmentInput = z.object({
  startIso: z.string().datetime({ offset: true }),
  durationMin: z.number().int().positive(),
  contactName: z.string().max(120).optional(),
  contactPhone: z.string().max(40).optional(),
  title: z.string().max(120).optional(),
  online: z.boolean().optional(),
  contactEmail: z.string().email().max(160).optional(),
  odooPartnerId: z.number().int().optional(),
  invite: z.boolean().optional(),
});
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentInput>;

/** Sugestão de contato do Odoo (autocomplete da /agenda). */
export const ContactSuggestion = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});
export type ContactSuggestion = z.infer<typeof ContactSuggestion>;
export const ContactSearchResult = z.object({ results: z.array(ContactSuggestion) });
