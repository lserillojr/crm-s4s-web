"use client";

/**
 * WorkingHoursForm — componente controlado de configuração de horário.
 *
 * Story 7.6-DEV. Reusável e isolado:
 * - NÃO chama API
 * - NÃO depende de Auth / tenant context
 * - Recebe `value` + emite via `onChange` (padrão controlado)
 *
 * O backend real (Chatwoot Business Hours por inbox) chega junto com Keycloak.
 * Quando isso acontecer, a página host que envolve esse componente é quem
 * persiste — o componente em si não muda.
 */
import {
  DAY_KEYS,
  DAY_LABELS,
  type DayHours,
  type DayKey,
  type WeeklyHours,
} from "@/lib/working-hours/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface WorkingHoursFormProps {
  value: WeeklyHours;
  onChange: (next: WeeklyHours) => void;
  disabled?: boolean;
}

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(hhmm: string): number {
  if (!HHMM_REGEX.test(hhmm)) return Number.NaN;
  const [h, m] = hhmm.split(":");
  if (h === undefined || m === undefined) return Number.NaN;
  return Number(h) * 60 + Number(m);
}

/** Open >= close em dia aberto = inválido. NaN (input vazio etc) não acusa. */
function isDayInvalid(day: DayHours): boolean {
  if (day.closed) return false;
  const o = timeToMinutes(day.open);
  const c = timeToMinutes(day.close);
  if (Number.isNaN(o) || Number.isNaN(c)) return false;
  return o >= c;
}

export function WorkingHoursForm({
  value,
  onChange,
  disabled = false,
}: WorkingHoursFormProps) {
  const patchDay = (key: DayKey, patch: Partial<DayHours>): void => {
    onChange({
      ...value,
      [key]: { ...value[key], ...patch },
    });
  };

  // "Preencher segunda a sexta" copia o regime da segunda pros dias úteis.
  const fillWeekdays = (): void => {
    const seed = value.monday;
    onChange({
      ...value,
      monday: { ...seed },
      tuesday: { ...seed },
      wednesday: { ...seed },
      thursday: { ...seed },
      friday: { ...seed },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-base">Horário de atendimento</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fillWeekdays}
          disabled={disabled}
          className="text-s4s-blue"
        >
          Preencher segunda a sexta 9h-18h
        </Button>
      </div>

      <div className="space-y-1.5 rounded-md border p-3">
        {DAY_KEYS.map((key) => {
          const day = value[key];
          const invalid = isDayInvalid(day);
          const checkboxId = `wh-${key}-closed`;
          const openId = `wh-${key}-open`;
          const closeId = `wh-${key}-close`;

          return (
            <div
              key={key}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-md p-2 sm:flex-nowrap",
                day.closed && "bg-muted/40 text-muted-foreground"
              )}
              data-day={key}
            >
              <div className="flex w-20 shrink-0 items-center">
                <Label className="text-sm font-medium">
                  {DAY_LABELS[key]}
                </Label>
              </div>

              <label
                htmlFor={checkboxId}
                className="flex shrink-0 cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={day.closed}
                  disabled={disabled}
                  onChange={(e) =>
                    patchDay(key, { closed: e.target.checked })
                  }
                  className="h-4 w-4"
                  aria-label={`${DAY_LABELS[key]} fechado`}
                />
                <span>Fechado</span>
              </label>

              <div className="flex flex-1 items-center gap-2">
                <Label htmlFor={openId} className="sr-only">
                  Abre ({DAY_LABELS[key]})
                </Label>
                <input
                  id={openId}
                  type="time"
                  value={day.open}
                  disabled={disabled || day.closed}
                  onChange={(e) => patchDay(key, { open: e.target.value })}
                  aria-label={`Hora de abertura ${DAY_LABELS[key]}`}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                    "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                />
                <span className="text-sm text-muted-foreground">às</span>
                <Label htmlFor={closeId} className="sr-only">
                  Fecha ({DAY_LABELS[key]})
                </Label>
                <input
                  id={closeId}
                  type="time"
                  value={day.close}
                  disabled={disabled || day.closed}
                  onChange={(e) => patchDay(key, { close: e.target.value })}
                  aria-label={`Hora de fechamento ${DAY_LABELS[key]}`}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                    "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                />
              </div>

              {invalid && (
                <p
                  role="alert"
                  className="w-full text-sm text-destructive sm:w-auto"
                >
                  horário inválido
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
