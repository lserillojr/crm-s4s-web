// DTOs e mapeadores do PROXY do app (/api/app/agenda/*). O app nunca vê
// odooPartnerId/source/blocks — só o que o cartão precisa. O fio interno
// BFF→FastAPI continua usando os nomes canônicos (odoo_partner_id etc.).
import { z } from "zod";
import type { AgendaList } from "./contract";

export interface AppAgendaItemDTO {
  id: string;
  inicio: string;      // ISO com offset
  fim: string;         // ISO com offset
  cliente: string;     // contactName ?? "Sem cliente"
  titulo: string | null;
  online: boolean;     // derivado de meetLink presente
}

export interface AppContatoDTO {
  id: number;
  nome: string;
  telefone: string | null;
}

export const AppCreateAppointmentInput = z.object({
  inicioISO: z.string().datetime({ offset: true }),
  duracaoMin: z.number().int().positive(),
  titulo: z.string().max(120).optional(),
  cliente: z.string().max(120).optional(),
  contatoId: z.number().int().optional(),
  telefone: z.string().max(40).optional(),
  online: z.boolean().optional(),
});
export type AppCreateAppointmentInput = z.infer<typeof AppCreateAppointmentInput>;

export const AppRescheduleInput = z.object({
  novoInicioISO: z.string().datetime({ offset: true }),
});
export type AppRescheduleInput = z.infer<typeof AppRescheduleInput>;

/** Próximo dia (YYYY-MM-DD) — aritmética em UTC para não pular fuso. */
export function proximoDia(dia: string): string {
  return new Date(Date.parse(`${dia}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

/** Filtra cancelados, mapeia para DTO limpo e ordena por horário. */
export function mapAgendaItens(lista: AgendaList): AppAgendaItemDTO[] {
  return lista.appointments
    .filter((a) => a.status !== "cancelado")
    .map((a) => ({
      id: a.id,
      inicio: a.start,
      fim: a.end,
      cliente: a.contactName ?? "Sem cliente",
      titulo: a.title ?? null,
      online: Boolean(a.meetLink),
    }))
    .sort((x, y) => x.inicio.localeCompare(y.inicio));
}

/** Traduz o corpo do app para o corpo canônico do FastAPI (fio interno). */
export function toAgendaServiceBody(input: AppCreateAppointmentInput) {
  return {
    start: input.inicioISO,
    duration_min: input.duracaoMin,
    contact_name: input.cliente ?? null,
    contact_phone: input.telefone ?? null,
    title: input.titulo ?? null,
    online: input.online ?? false,
    contact_email: null,
    odoo_partner_id: input.contatoId ?? null,
    invite: false,
  };
}
