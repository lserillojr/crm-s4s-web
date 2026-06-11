"use client";
import { weekDays, dayIndexOf, cardGeometry } from "@/lib/agenda/calendar";
import { cn } from "@/lib/utils";

export interface GridItem {
  kind: "appt" | "block";
  id: string;
  start: Date;
  end: Date;
  label: string;
  source: "ia" | "manual" | "block";
  status: string;
}

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 21;
const PX_PER_HOUR = 48;

const SOURCE_CLASS: Record<GridItem["source"], string> = {
  ia: "bg-s4s-blue/15 border-s4s-blue/40 text-s4s-blue",
  manual: "bg-s4s-magenta/15 border-s4s-magenta/40 text-s4s-magenta",
  block: "bg-s4s-gray-light border-muted-foreground/30 text-muted-foreground",
};

const fmtHora = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const colHeader = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

interface Props {
  weekStart: Date;
  dayCount: number;
  items: GridItem[];
  onCreateAt: (when: Date) => void;
  onSelect: (item: GridItem) => void;
}

export function CalendarGrid({ weekStart, dayCount, items, onCreateAt, onSelect }: Props) {
  const days = weekDays(weekStart, dayCount);
  const hours = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);
  const bodyHeight = hours.length * PX_PER_HOUR;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Cabeçalho dos dias */}
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(${dayCount}, 1fr)` }}>
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="border-b px-2 py-1 text-center text-xs font-semibold capitalize">
              {colHeader(d)}
            </div>
          ))}
        </div>
        {/* Corpo: coluna de horas + colunas dos dias */}
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(${dayCount}, 1fr)` }}>
          {/* Régua de horas */}
          <div className="relative" style={{ height: bodyHeight }}>
            {hours.map((h, i) => (
              <div key={h} className="absolute right-1 text-[10px] text-muted-foreground"
                style={{ top: i * PX_PER_HOUR - 5 }}>
                {String(h).padStart(2, "0")}h
              </div>
            ))}
          </div>
          {/* Colunas dos dias */}
          {days.map((day, colIdx) => {
            const dayItems = items.filter((it) => dayIndexOf(it.start, days) === colIdx);
            return (
              <div key={day.toISOString()} className="relative border-l" style={{ height: bodyHeight }}>
                {/* células-hora clicáveis (criar) */}
                {hours.map((h, i) => {
                  const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0);
                  return (
                    <button key={h} type="button"
                      aria-label={`Criar em ${when.toISOString()}`}
                      onClick={() => onCreateAt(when)}
                      className="absolute left-0 right-0 border-b border-dashed border-muted/40 hover:bg-s4s-blue/5"
                      style={{ top: i * PX_PER_HOUR, height: PX_PER_HOUR }} />
                  );
                })}
                {/* cards */}
                {dayItems.map((it) => {
                  const { topPx, heightPx } = cardGeometry(it.start, it.end, GRID_START_HOUR, PX_PER_HOUR);
                  return (
                    <button key={it.id} type="button"
                      onClick={() => onSelect(it)}
                      className={cn(
                        "absolute left-1 right-1 overflow-hidden rounded border px-1 py-0.5 text-left text-[11px] leading-tight",
                        SOURCE_CLASS[it.source],
                        it.status === "cancelado" && "line-through opacity-50",
                      )}
                      style={{ top: topPx, height: heightPx }}>
                      <span className="block font-mono">{fmtHora(it.start)}</span>
                      <span className="block truncate">{it.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* Legenda */}
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-s4s-blue/40 bg-s4s-blue/15" /> IA</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-s4s-magenta/40 bg-s4s-magenta/15" /> Manual</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-muted-foreground/30 bg-s4s-gray-light" /> Bloqueio</span>
        </div>
      </div>
    </div>
  );
}
