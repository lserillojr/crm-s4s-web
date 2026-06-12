"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  id?: string;
  /** Valor no formato datetime-local "YYYY-MM-DDTHH:mm" (ou "" se incompleto). */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** "00:00", "00:30", … "23:30" — dia inteiro de 30 em 30min. */
const SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

function split(value: string): [string, string] {
  if (value.includes("T")) {
    const [d, t] = value.split("T");
    return [d ?? "", (t ?? "").slice(0, 5)];
  }
  return [value, ""];
}

/**
 * Seletor de data/hora estilo "agenda do Google": campo de data + dropdown de
 * horários (00:00–23:30 a cada 30min). Substitui o `<input type="datetime-local">`
 * nativo mantendo o MESMO contrato de string ("YYYY-MM-DDTHH:mm") na entrada e
 * saída — os helpers de fuso (localInputToIso/toLocalInput) e o backend não mudam.
 *
 * Se o valor recebido tiver uma hora fora da grade de 30min (ex.: reagendar um
 * agendamento da IA às 09:15), essa hora é adicionada como opção extra para não
 * se perder.
 */
export function DateTimePicker({ id, value, onChange, disabled }: Props) {
  const [initDate, initTime] = split(value);
  const [date, setDate] = useState(initDate);
  const [time, setTime] = useState(initTime);
  // Ressincroniza quando o pai injeta um valor novo (ex.: reagendar pré-preenchido),
  // sem brigar com a digitação parcial (date sem time ainda).
  const lastEmit = useRef(value);
  useEffect(() => {
    if (value !== lastEmit.current) {
      const [d, t] = split(value);
      setDate(d);
      setTime(t);
      lastEmit.current = value;
    }
  }, [value]);

  const update = (d: string, t: string) => {
    setDate(d);
    setTime(t);
    const combined = d && t ? `${d}T${t}` : "";
    lastEmit.current = combined;
    onChange(combined);
  };

  const options = time && !SLOTS.includes(time) ? [time, ...SLOTS] : SLOTS;

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type="date"
        value={date}
        disabled={disabled}
        onChange={(e) => update(e.target.value, time)}
        className="flex-1"
      />
      <select
        aria-label="Horário"
        value={time}
        disabled={disabled}
        onChange={(e) => update(date, e.target.value)}
        className={cn(
          "h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <option value="" disabled>
          Hora
        </option>
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
