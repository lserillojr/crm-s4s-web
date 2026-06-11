"use client";
import { useMemo, useState } from "react";
import {
  useAgenda, useCreateBlock, useDeleteBlock, useCancelAppointment,
  useRescheduleAppointment, useCreateAppointment,
} from "@/lib/agenda/use-agenda";
import type { AgendaList } from "@/lib/agenda/contract";
import { startOfWeek, addDays, weekDays } from "@/lib/agenda/calendar";
import { Button } from "@/components/ui/button";
import { CalendarGrid, type GridItem } from "./calendar-grid";
import { AppointmentForm, type AppointmentDraft } from "./appointment-form";
import { AppointmentPanel } from "./appointment-panel";
import { BlockForm } from "./block-form";

type View = "week" | "day";

/** datetime-local string ("YYYY-MM-DDTHH:mm") a partir de um Date local. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** "YYYY-MM-DD" a partir dos componentes LOCAIS do Date (não UTC — evita
 *  off-by-one em fusos UTC+, já que gridStart é meia-noite local). */
const ymd = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Converte a resposta da API (ISO strings) em GridItem (Date + label + source). */
function toGridItems(data: AgendaList): GridItem[] {
  const appts: GridItem[] = data.appointments.map((a) => ({
    kind: "appt", id: a.id, start: new Date(a.start), end: new Date(a.end),
    label: a.title ? `${a.contactName ?? "Cliente"} — ${a.title}` : (a.contactName ?? "Cliente"),
    source: a.source === "ia" ? "ia" : "manual", status: a.status,
  }));
  const blocks: GridItem[] = data.blocks.map((b) => ({
    kind: "block", id: b.id, start: new Date(b.start), end: new Date(b.end),
    label: b.reason ?? "Horário bloqueado", source: "block", status: "",
  }));
  return [...appts, ...blocks];
}

export function AgendaClient() {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const dayCount = view === "week" ? 6 : 1;
  const gridStart = view === "week" ? weekStart : new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const rangeFrom = ymd(gridStart);
  const rangeTo = ymd(addDays(gridStart, dayCount));

  const { data, isLoading, isError } = useAgenda(rangeFrom, rangeTo);
  const items = useMemo(() => (data ? toGridItems(data) : []), [data]);
  const visibleDays = weekDays(gridStart, dayCount);

  const createAppt = useCreateAppointment();
  const createBlock = useCreateBlock();
  const deleteBlock = useDeleteBlock();
  const cancelAppt = useCancelAppointment();
  const rescheduleAppt = useRescheduleAppointment();

  const [draftStart, setDraftStart] = useState<string | null>(null); // datetime-local p/ criar
  const [selected, setSelected] = useState<GridItem | null>(null);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const apptConflict = createAppt.isError && (createAppt.error as Error)?.message === "conflict";

  const handleCreateAt = (when: Date) => { setSelected(null); setShowBlockForm(false); createAppt.reset(); setDraftStart(toLocalInput(when)); };
  /** Abrir o painel de um card fecha qualquer form aberto (simetria com handleCreateAt/+Bloquear). */
  const handleSelect = (item: GridItem) => { setDraftStart(null); setShowBlockForm(false); createAppt.reset(); setSelected(item); };
  const handleSubmitAppt = (draft: AppointmentDraft) => {
    createAppt.mutate(
      { startIso: draft.startIso, durationMin: draft.durationMin, contactName: draft.contactName, contactPhone: draft.contactPhone, title: draft.title },
      { onSuccess: () => setDraftStart(null) },
    );
  };
  const handleReschedule = (item: GridItem) => {
    const novo = window.prompt("Nova data e hora (AAAA-MM-DD HH:MM):");
    if (!novo) return;
    const d = new Date(novo.replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    const off = -d.getTimezoneOffset(); const sign = off >= 0 ? "+" : "-";
    const oh = pad(Math.floor(Math.abs(off) / 60)); const om = pad(Math.abs(off) % 60);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${oh}:${om}`;
    rescheduleAppt.mutate({ id: item.id, newSlotIso: iso }, { onSuccess: () => setSelected(null) });
  };

  return (
    <div className="space-y-4">
      {/* Barra de navegação + ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAnchor(addDays(anchor, view === "week" ? -7 : -1))}>‹</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Hoje</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setAnchor(addDays(anchor, view === "week" ? 7 : 1))}>›</Button>
          <span className="ml-2 text-sm text-muted-foreground capitalize">
            {visibleDays[0]?.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <button type="button" onClick={() => setView("day")} className={view === "day" ? "bg-s4s-blue px-3 py-1 text-xs text-white" : "px-3 py-1 text-xs"}>Dia</button>
            <button type="button" onClick={() => setView("week")} className={view === "week" ? "bg-s4s-blue px-3 py-1 text-xs text-white" : "px-3 py-1 text-xs"}>Semana</button>
          </div>
          <Button type="button" size="sm" onClick={() => { setShowBlockForm(true); setDraftStart(null); setSelected(null); }} className="bg-s4s-blue hover:bg-s4s-blue/90">+ Bloquear</Button>
        </div>
      </div>

      {/* Form de criar (clique no vazio) */}
      {draftStart && (
        <AppointmentForm isPending={createAppt.isPending} isError={createAppt.isError} isConflict={apptConflict}
          defaultStart={draftStart} defaultDurationMin={60}
          onSubmit={handleSubmitAppt} onCancel={() => { setDraftStart(null); createAppt.reset(); }} />
      )}
      {/* Form de bloqueio */}
      {showBlockForm && (
        <BlockForm isPending={createBlock.isPending} isError={createBlock.isError}
          onSubmit={(input) => createBlock.mutate(input, { onSuccess: () => setShowBlockForm(false) })}
          onCancel={() => { setShowBlockForm(false); createBlock.reset(); }} />
      )}
      {/* Painel do card selecionado */}
      {selected && (
        <AppointmentPanel item={selected} isPending={cancelAppt.isPending || deleteBlock.isPending || rescheduleAppt.isPending}
          onClose={() => setSelected(null)}
          onReschedule={handleReschedule}
          onCancel={(id) => cancelAppt.mutate(id, { onSuccess: () => setSelected(null) })}
          onDeleteBlock={(id) => deleteBlock.mutate(id, { onSuccess: () => setSelected(null) })} />
      )}

      {/* Estados de carregamento/erro */}
      {isLoading && <p role="status" className="text-muted-foreground">Carregando sua agenda…</p>}
      {isError && <p role="alert" className="text-muted-foreground">Não foi possível carregar sua agenda agora. Tente atualizar a página.</p>}

      {/* Grade */}
      {data && (
        <CalendarGrid weekStart={gridStart} dayCount={dayCount} items={items}
          onCreateAt={handleCreateAt} onSelect={handleSelect} />
      )}
    </div>
  );
}
