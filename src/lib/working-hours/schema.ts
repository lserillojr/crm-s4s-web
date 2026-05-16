/**
 * Schema + helpers de horário de atendimento semanal (Story 7.6-DEV).
 *
 * Componente puro / dados puros — NÃO toca em API. Quando o backend real
 * (Chatwoot Business Hours por inbox via API) chegar junto com Auth/Keycloak,
 * o proxy consome esse mesmo `WeeklyHours` sem mudar de shape.
 *
 * Forma `monday/tuesday/...` (em vez de array indexado) escolhida pra que
 * `value[dayKey]` seja seguro com `noUncheckedIndexedAccess` — chave fixa
 * vira lookup tipado, sem precisar de guard.
 *
 * Aliases legados (`workingHoursSchema`, `WorkingHours`, etc) ficam exportados
 * pra manter clientes pré-existentes (settings/working-hours) compilando até
 * migrarem pro novo shape.
 */
import { z } from "zod";

/* ---------- Constantes / tipos públicos ---------- */

export const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

/** Labels curtos pt-BR. Usados no form e na summary. */
export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sáb",
  sunday: "Dom",
};

/* ---------- Schemas Zod (novo shape) ---------- */

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const dayHoursSchema = z.object({
  closed: z.boolean(),
  open: z.string().regex(HHMM_REGEX, { message: "Horário inválido" }),
  close: z.string().regex(HHMM_REGEX, { message: "Horário inválido" }),
});

export type DayHours = z.infer<typeof dayHoursSchema>;

export const weeklyHoursSchema = z
  .object({
    monday: dayHoursSchema,
    tuesday: dayHoursSchema,
    wednesday: dayHoursSchema,
    thursday: dayHoursSchema,
    friday: dayHoursSchema,
    saturday: dayHoursSchema,
    sunday: dayHoursSchema,
  })
  .superRefine((value, ctx) => {
    // Se um dia está aberto, open precisa ser estritamente < close.
    // Dia fechado ignora — open/close podem ser qualquer "HH:MM" válido.
    for (const key of DAY_KEYS) {
      const day = value[key];
      if (day.closed) continue;
      if (toMinutes(day.open) >= toMinutes(day.close)) {
        ctx.addIssue({
          code: "custom",
          message: "Horário de abertura deve ser anterior ao de fechamento",
          path: [key],
        });
      }
    }
  });

export type WeeklyHours = z.infer<typeof weeklyHoursSchema>;

export const weeklyHoursDefaults: WeeklyHours = {
  monday: { closed: false, open: "09:00", close: "18:00" },
  tuesday: { closed: false, open: "09:00", close: "18:00" },
  wednesday: { closed: false, open: "09:00", close: "18:00" },
  thursday: { closed: false, open: "09:00", close: "18:00" },
  friday: { closed: false, open: "09:00", close: "18:00" },
  saturday: { closed: false, open: "09:00", close: "13:00" },
  sunday: { closed: true, open: "09:00", close: "18:00" },
};

/* ---------- Helpers ---------- */

/** Converte "HH:MM" → minutos absolutos. Inputs inválidos viram NaN. */
function toMinutes(hhmm: string): number {
  if (!HHMM_REGEX.test(hhmm)) return Number.NaN;
  const [h, m] = hhmm.split(":");
  if (h === undefined || m === undefined) return Number.NaN;
  return Number(h) * 60 + Number(m);
}

/** Mesmo regime = ambos fechados OU ambos abertos com mesmo open+close. */
function sameRegime(a: DayHours, b: DayHours): boolean {
  if (a.closed && b.closed) return true;
  if (a.closed || b.closed) return false;
  return a.open === b.open && a.close === b.close;
}

function formatRange(
  startKey: DayKey,
  endKey: DayKey,
  day: DayHours
): string {
  const label =
    startKey === endKey
      ? DAY_LABELS[startKey]
      : `${DAY_LABELS[startKey]}-${DAY_LABELS[endKey]}`;
  if (day.closed) return `${label} fechado`;
  return `${label} ${day.open}-${day.close}`;
}

/**
 * Resume horário semanal compactando dias consecutivos com mesmo regime.
 *
 * Exemplos:
 *   Seg-Sex 09:00-18:00 · Sáb 09:00-13:00 · Dom fechado
 *   Semana toda fechada → "Fechado"
 */
export function formatWeeklyHoursSummary(value: WeeklyHours): string {
  const allClosed = DAY_KEYS.every((k) => value[k].closed);
  if (allClosed) return "Fechado";

  const ranges: string[] = [];
  let startIdx = 0;
  for (let i = 1; i <= DAY_KEYS.length; i += 1) {
    const prevKey = DAY_KEYS[i - 1];
    if (prevKey === undefined) continue;
    const currKey = i < DAY_KEYS.length ? DAY_KEYS[i] : undefined;
    const prev = value[prevKey];
    const curr = currKey ? value[currKey] : undefined;

    const breakRange = curr === undefined || !sameRegime(prev, curr);
    if (breakRange) {
      const startKey = DAY_KEYS[startIdx];
      if (startKey !== undefined) {
        ranges.push(formatRange(startKey, prevKey, prev));
      }
      startIdx = i;
    }
  }

  return ranges.join(" · ");
}

/* ---------- Aliases legados ----------
 * Mantidos pra clientes pré-existentes do scaffold Story 7.2 (página
 * /settings/working-hours) continuarem compilando. Migrar pro novo shape
 * vem numa story separada — esses exports são deprecated.
 */

/** @deprecated use DAY_LABELS + DAY_KEYS. */
export const WEEK_DAY_LABELS: Record<string, string> = {
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sáb",
  sun: "Dom",
};

/** @deprecated mantido pra wizard calendar step / clientes pré-existentes. */
export const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Recife",
  "America/Belem",
] as const;

/** @deprecated mantido pra wizard calendar step / clientes pré-existentes. */
export const TIMEZONE_LABELS: Record<(typeof TIMEZONES)[number], string> = {
  "America/Sao_Paulo": "São Paulo (GMT-3) — Sul/Sudeste",
  "America/Manaus": "Manaus (GMT-4) — Amazonas/RO/RR",
  "America/Recife": "Recife (GMT-3) — Nordeste",
  "America/Belem": "Belém (GMT-3) — Pará/Amapá",
};

/** @deprecated use `weeklyHoursSchema`. */
export const workingHoursSchema = weeklyHoursSchema;

/** @deprecated use `WeeklyHours`. */
export type WorkingHours = WeeklyHours;

/** @deprecated use `weeklyHoursDefaults`. */
export const workingHoursDefaults = weeklyHoursDefaults;

/** @deprecated cosmético; mantido pra compatibilidade. */
export function formatTimeForDisplay(open: string, close: string): string {
  return `${open} às ${close}`;
}
