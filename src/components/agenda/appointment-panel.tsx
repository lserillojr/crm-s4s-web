"use client";
import { useState } from "react";
import type { GridItem } from "./calendar-grid";
import { ContactPopover } from "./contact-popover";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/agenda/datetime-picker";
import { localInputToIso, toLocalInput } from "@/lib/agenda/datetime";

interface Props {
  item: GridItem;
  isPending: boolean;
  onClose: () => void;
  onReschedule: (item: GridItem, newSlotIso: string) => void;
  onCancel: (id: string) => void;
  onDeleteBlock: (id: string) => void;
}

const fmt = (d: Date) =>
  d.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });

export function AppointmentPanel({ item, isPending, onClose, onReschedule, onCancel, onDeleteBlock }: Props) {
  const [rescheduling, setRescheduling] = useState(false);
  const [slot, setSlot] = useState("");
  const [contactOpen, setContactOpen] = useState(false);

  const openReschedule = () => { setSlot(toLocalInput(item.start)); setRescheduling(true); };
  const confirmReschedule = () => {
    const iso = localInputToIso(slot);
    if (!iso) return;
    onReschedule(item, iso);
  };

  const copyMeet = () => { if (item.meetLink) void navigator.clipboard.writeText(item.meetLink); };
  const hasContact = item.kind === "appt" && !!item.odooPartnerId;

  return (
    <Modal onClose={onClose} ariaLabel={`Detalhes de ${item.label}`} widthClass="max-w-md">
      <div className="flex items-start justify-between">
        <div>
          {hasContact ? (
            <button type="button" onClick={() => setContactOpen(true)}
              className="text-left text-sm font-semibold text-s4s-blue underline-offset-2 hover:underline">
              {item.label}
            </button>
          ) : (
            <h3 className="text-sm font-semibold">{item.label}</h3>
          )}
          <p className="text-xs text-muted-foreground capitalize">{fmt(item.start)} – {item.end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
          {item.kind === "appt" && (
            <span className="mt-1 inline-block rounded bg-s4s-gray-light px-2 py-0.5 text-xs text-muted-foreground">
              {item.source === "ia" ? "agendado pela IA" : "agendado por você"}
            </span>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
      </div>

      {item.meetLink && (
        <div className="flex items-center gap-2 rounded-md border bg-s4s-blue/5 px-3 py-2 text-xs">
          <span className="font-medium text-s4s-blue">Videochamada:</span>
          <a href={item.meetLink} target="_blank" rel="noreferrer" className="truncate text-s4s-blue underline">{item.meetLink}</a>
          <Button type="button" size="sm" variant="outline" className="ml-auto shrink-0" onClick={copyMeet}>Copiar</Button>
        </div>
      )}

      {hasContact && item.contactEmail && (
        <button type="button" onClick={() => setContactOpen(true)}
          className="flex items-center gap-2 text-xs text-s4s-blue underline-offset-2 hover:underline">
          <span aria-hidden="true">✉</span>
          {item.contactEmail}
        </button>
      )}

      {item.kind === "appt" && item.status !== "cancelado" && !rescheduling && (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={isPending}
            onClick={openReschedule} className="text-s4s-blue">Reagendar</Button>
          <Button type="button" size="sm" variant="ghost" disabled={isPending}
            onClick={() => onCancel(item.id)} className="text-muted-foreground hover:text-destructive">
            {isPending ? "Cancelando…" : "Cancelar"}
          </Button>
        </div>
      )}

      {item.kind === "appt" && rescheduling && (
        <div className="space-y-2 rounded-md border bg-white p-3">
          <Label htmlFor={`reschedule-${item.id}`}>Nova data e hora</Label>
          <DateTimePicker id={`reschedule-${item.id}`} value={slot} onChange={setSlot} disabled={isPending} />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" disabled={isPending}
              onClick={() => setRescheduling(false)}>Cancelar</Button>
            <Button type="button" size="sm" disabled={isPending}
              onClick={confirmReschedule} className="bg-s4s-blue hover:bg-s4s-blue/90">
              {isPending ? "Salvando…" : "Confirmar"}
            </Button>
          </div>
        </div>
      )}

      {item.kind === "block" && (
        <Button type="button" size="sm" variant="ghost" disabled={isPending}
          onClick={() => onDeleteBlock(item.id)} className="text-muted-foreground hover:text-destructive">
          {isPending ? "Removendo…" : "Remover bloqueio"}
        </Button>
      )}

      {contactOpen && (
        <ContactPopover
          name={item.contactName ?? null}
          email={item.contactEmail ?? null}
          phone={item.contactPhone ?? null}
          onClose={() => setContactOpen(false)}
        />
      )}
    </Modal>
  );
}
