"use client";
import type { GridItem } from "./calendar-grid";
import { Button } from "@/components/ui/button";

interface Props {
  item: GridItem;
  isPending: boolean;
  onClose: () => void;
  onReschedule: (item: GridItem) => void;
  onCancel: (id: string) => void;
  onDeleteBlock: (id: string) => void;
}

const fmt = (d: Date) =>
  d.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });

export function AppointmentPanel({ item, isPending, onClose, onReschedule, onCancel, onDeleteBlock }: Props) {
  return (
    <aside className="space-y-3 rounded-md border bg-white p-4" aria-label={`Detalhes de ${item.label}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">{item.label}</h3>
          <p className="text-xs text-muted-foreground capitalize">{fmt(item.start)} – {item.end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
          {item.kind === "appt" && (
            <span className="mt-1 inline-block rounded bg-s4s-gray-light px-2 py-0.5 text-xs text-muted-foreground">
              {item.source === "ia" ? "agendado pela IA" : "agendado por você"}
            </span>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
      </div>
      {item.kind === "appt" && item.status !== "cancelado" && (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={isPending}
            onClick={() => onReschedule(item)} className="text-s4s-blue">Reagendar</Button>
          <Button type="button" size="sm" variant="ghost" disabled={isPending}
            onClick={() => onCancel(item.id)} className="text-muted-foreground hover:text-destructive">
            {isPending ? "Cancelando…" : "Cancelar"}
          </Button>
        </div>
      )}
      {item.kind === "block" && (
        <Button type="button" size="sm" variant="ghost" disabled={isPending}
          onClick={() => onDeleteBlock(item.id)} className="text-muted-foreground hover:text-destructive">
          {isPending ? "Removendo…" : "Remover bloqueio"}
        </Button>
      )}
    </aside>
  );
}
