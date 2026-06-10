"use client";
import { useMemo, useState } from "react";
import { useAgenda, useCreateBlock, useDeleteBlock, useCancelAppointment, useRescheduleAppointment } from "@/lib/agenda/use-agenda";
import type { AgendaList } from "@/lib/agenda/contract";
import { BlockInput, RescheduleInput } from "@/lib/agenda/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BlockForm } from "./block-form";

/** Janela fixa: próximos 30 dias a partir de hoje (visual simples; calendário
 * rico fica para a Onda 2). 30 dias — e não 7 — para não cortar compromissos
 * recorrentes da semana seguinte (ex.: aulas seg/qua/sex). */
const JANELA_DIAS = 30;
function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + JANELA_DIAS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

type Item =
  | { kind: "appt"; id: string; start: string; end: string; title: string; status: string }
  | { kind: "block"; id: string; start: string; end: string; title: string };

const fmtDia = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

type Grupo = { dia: string; label: string; itens: Item[] };

/** Agrupa agendamentos + bloqueios por dia (chave dd/mm/aaaa), ordenados no tempo. */
function agruparPorDia(data: AgendaList): Grupo[] {
  const itens: Item[] = [
    ...data.appointments.map(
      (a): Item => ({
        kind: "appt",
        id: a.id,
        start: a.start,
        end: a.end,
        title: a.contactName ?? "Cliente",
        status: a.status,
      }),
    ),
    ...data.blocks.map(
      (b): Item => ({
        kind: "block",
        id: b.id,
        start: b.start,
        end: b.end,
        title: b.reason ?? "Horário bloqueado",
      }),
    ),
  ].sort((x, y) => x.start.localeCompare(y.start));

  const grupos = new Map<string, Grupo>();
  for (const it of itens) {
    const dia = new Date(it.start).toLocaleDateString("pt-BR");
    const grupo = grupos.get(dia) ?? { dia, label: fmtDia(it.start), itens: [] };
    grupo.itens.push(it);
    grupos.set(dia, grupo);
  }
  return [...grupos.values()];
}

/** Converte datetime-local string ("YYYY-MM-DDTHH:mm") para ISO com timezone. */
function localInputToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${hh}:${mm}`;
}

// ---------------------------------------------------------------------------
// Subcomponente: reagendar inline
// ---------------------------------------------------------------------------

interface RescheduleInlineProps {
  apptId: string;
  isPending: boolean;
  isError: boolean;
  onSubmit: (newSlotIso: string) => void;
  onCancel: () => void;
}

function RescheduleInline({ apptId, isPending, isError, onSubmit, onCancel }: RescheduleInlineProps) {
  const [newSlot, setNewSlot] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const iso = localInputToIso(newSlot);
    if (!iso) {
      setValidationError("Informe a nova data e hora do agendamento.");
      return;
    }
    const result = RescheduleInput.safeParse({ newSlotIso: iso });
    if (!result.success) {
      setValidationError("Data inválida. Verifique e tente novamente.");
      return;
    }
    onSubmit(result.data.newSlotIso);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 space-y-2 rounded-md border bg-muted/30 p-3"
      aria-label={`Reagendar compromisso ${apptId}`}
    >
      {validationError && (
        <p role="alert" className="text-sm text-red-700">{validationError}</p>
      )}
      {isError && (
        <p role="alert" className="text-sm text-red-700">
          Não consegui reagendar. Tente de novo em instantes.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={`reschedule-${apptId}`} className="text-xs">
            Nova data e hora
          </Label>
          <Input
            id={`reschedule-${apptId}`}
            type="datetime-local"
            value={newSlot}
            onChange={(e) => setNewSlot(e.target.value)}
            disabled={isPending}
            required
            className="h-8 text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={isPending} className="bg-s4s-blue hover:bg-s4s-blue/90">
          {isPending ? "Salvando…" : "Confirmar"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * Tela da Agenda (Onda 2 — editável): lista os próximos compromissos do MEI,
 * agrupados por dia, com ações de cancelar/reagendar + criar/remover bloqueios.
 */
export function AgendaClient() {
  const { from, to } = useMemo(defaultRange, []);
  const { data, isLoading, isError } = useAgenda(from, to);

  const grupos = useMemo(() => (data ? agruparPorDia(data) : []), [data]);

  // Mutations
  const createBlock = useCreateBlock();
  const deleteBlock = useDeleteBlock();
  const cancelAppt = useCancelAppointment();
  const rescheduleAppt = useRescheduleAppointment();

  // UI state
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  const handleCreateBlock = (input: BlockInput) => {
    createBlock.mutate(input, {
      onSuccess: () => setShowBlockForm(false),
    });
  };

  return (
    <div className="space-y-6">
      {/* ---- Barra de ações globais ---- */}
      <div className="flex items-center justify-between gap-3">
        {!showBlockForm && (
          <Button
            type="button"
            size="sm"
            onClick={() => setShowBlockForm(true)}
            className="bg-s4s-blue hover:bg-s4s-blue/90"
          >
            + Bloquear horário
          </Button>
        )}
      </div>

      {/* ---- Formulário de novo bloqueio ---- */}
      {showBlockForm && (
        <BlockForm
          isPending={createBlock.isPending}
          isError={createBlock.isError}
          onSubmit={handleCreateBlock}
          onCancel={() => {
            setShowBlockForm(false);
            createBlock.reset();
          }}
        />
      )}

      {/* ---- Feedback de ações inline ---- */}
      {deleteBlock.isError && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          Não consegui remover o bloqueio. Tente de novo em instantes.
        </p>
      )}
      {cancelAppt.isError && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          Não consegui cancelar o compromisso. Tente de novo em instantes.
        </p>
      )}

      {/* ---- Estados da query ---- */}
      {isLoading && (
        <p role="status" className="text-muted-foreground">
          Carregando sua agenda…
        </p>
      )}
      {isError && (
        <p role="alert" className="text-muted-foreground">
          Não foi possível carregar sua agenda agora. Tente atualizar a página.
        </p>
      )}

      {data && grupos.length === 0 && (
        <p className="text-muted-foreground">
          Você não tem compromissos nos próximos 30 dias.
        </p>
      )}

      {grupos.map((grupo) => (
        <section key={grupo.dia} aria-label={grupo.dia} className="space-y-2">
          <h2 className="font-heading text-lg font-semibold capitalize">
            {grupo.label}
          </h2>
          <ul className="space-y-2">
            {grupo.itens.map((it, i) => (
              <li
                key={`${grupo.dia}-${i}`}
                className="rounded-md border bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-s4s-blue">
                    {fmtHora(it.start)}–{fmtHora(it.end)}
                  </span>
                  <span className="flex-1">{it.title}</span>

                  {it.kind === "block" ? (
                    <>
                      <span className="rounded bg-s4s-gray-light px-2 py-0.5 text-xs text-muted-foreground">
                        bloqueio
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBlock.mutate(it.id)}
                        disabled={deleteBlock.isPending}
                        className={cn(
                          "text-xs text-muted-foreground hover:text-destructive",
                          deleteBlock.isPending && "opacity-50",
                        )}
                        aria-label={`Remover bloqueio ${it.title}`}
                      >
                        {deleteBlock.isPending ? "Removendo…" : "Remover"}
                      </Button>
                    </>
                  ) : (
                    <>
                      {it.status !== "confirmado" ? (
                        <span className="rounded bg-s4s-gray-light px-2 py-0.5 text-xs text-muted-foreground">
                          {it.status}
                        </span>
                      ) : null}
                      {it.status !== "cancelado" && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRescheduleId(rescheduleId === it.id ? null : it.id);
                              rescheduleAppt.reset();
                            }}
                            disabled={cancelAppt.isPending}
                            className="text-xs text-s4s-blue hover:text-s4s-blue/80"
                            aria-label={`Reagendar compromisso com ${it.title}`}
                          >
                            Reagendar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelAppt.mutate(it.id)}
                            disabled={cancelAppt.isPending}
                            className={cn(
                              "text-xs text-muted-foreground hover:text-destructive",
                              cancelAppt.isPending && "opacity-50",
                            )}
                            aria-label={`Cancelar compromisso com ${it.title}`}
                          >
                            {cancelAppt.isPending ? "Cancelando…" : "Cancelar"}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Inline reagendar form */}
                {it.kind === "appt" && rescheduleId === it.id && (
                  <RescheduleInline
                    apptId={it.id}
                    isPending={rescheduleAppt.isPending}
                    isError={rescheduleAppt.isError}
                    onSubmit={(newSlotIso) =>
                      rescheduleAppt.mutate(
                        { id: it.id, newSlotIso },
                        { onSuccess: () => setRescheduleId(null) },
                      )
                    }
                    onCancel={() => {
                      setRescheduleId(null);
                      rescheduleAppt.reset();
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
