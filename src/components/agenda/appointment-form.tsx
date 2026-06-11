"use client";
import { useState } from "react";
import { CreateAppointmentInput } from "@/lib/agenda/contract";
import { localInputToIso } from "@/lib/agenda/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface AppointmentDraft {
  startIso: string;
  durationMin: number;
  contactName?: string;
  contactPhone?: string;
  title?: string;
}

interface Props {
  isPending: boolean;
  isError: boolean;
  isConflict: boolean;
  /** datetime-local pré-preenchido (ex.: clicou num horário da grade). */
  defaultStart: string;
  defaultDurationMin: number;
  onSubmit: (draft: AppointmentDraft) => void;
  onCancel: () => void;
}

export function AppointmentForm({
  isPending, isError, isConflict, defaultStart, defaultDurationMin, onSubmit, onCancel,
}: Props) {
  const [start, setStart] = useState(defaultStart);
  const [durationMin, setDurationMin] = useState(String(defaultDurationMin));
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [title, setTitle] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const startIso = localInputToIso(start);
    const draft: AppointmentDraft = {
      startIso,
      durationMin: Number(durationMin),
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      title: title || undefined,
    };
    const result = CreateAppointmentInput.safeParse(draft);
    if (!result.success) {
      setValidationError("Verifique a data, a hora e a duração.");
      return;
    }
    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border bg-white p-4" aria-label="Novo agendamento">
      <h3 className="text-sm font-semibold">Novo agendamento</h3>
      {validationError && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{validationError}</p>
      )}
      {isConflict && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Esse horário já está ocupado. Escolha outro.
        </p>
      )}
      {isError && !isConflict && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          Não consegui criar o agendamento. Tente de novo em instantes.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="appt-start">Data e hora</Label>
          <Input id="appt-start" type="datetime-local" value={start}
            onChange={(e) => setStart(e.target.value)} disabled={isPending} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="appt-duration">Duração (min)</Label>
          <Input id="appt-duration" type="number" min={5} step={5} value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)} disabled={isPending} required />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="appt-contact">Cliente</Label>
        <Input id="appt-contact" type="text" placeholder="Nome do cliente" value={contactName}
          onChange={(e) => setContactName(e.target.value)} disabled={isPending} maxLength={120} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="appt-title">Serviço / descrição</Label>
          <Input id="appt-title" type="text" placeholder="Ex.: corte, consulta…" value={title}
            onChange={(e) => setTitle(e.target.value)} disabled={isPending} maxLength={120} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="appt-phone">Telefone (opcional)</Label>
          <Input id="appt-phone" type="tel" value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)} disabled={isPending} maxLength={40} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={isPending} className={cn("bg-s4s-blue hover:bg-s4s-blue/90")}>
          {isPending ? "Salvando…" : "Agendar"}
        </Button>
      </div>
    </form>
  );
}
