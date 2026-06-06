"use client";
import { useState } from "react";
import { BlockInput } from "@/lib/agenda/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Formulário inline para criar um bloqueio de horário.
 * Converte o valor do input datetime-local para ISO 8601 com timezone antes de
 * enviar — garante que o Zod z.string().datetime() valide corretamente.
 */

interface BlockFormProps {
  isPending: boolean;
  isError: boolean;
  onSubmit: (input: BlockInput) => void;
  onCancel: () => void;
}

/** datetime-local devolve "YYYY-MM-DDTHH:mm" (sem TZ). Precisamos do offset local. */
function localInputToIso(value: string): string {
  if (!value) return "";
  // new Date("YYYY-MM-DDTHH:mm") é interpretado como local em ambientes de browser;
  // toISOString() converte para UTC com 'Z'. Queremos o offset local explícito.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // Pega offset em minutos, converte para +HH:MM
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  // Formata como ISO sem TZ então adiciona offset
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${hh}:${mm}`;
  return local;
}

export function BlockForm({ isPending, isError, onSubmit, onCancel }: BlockFormProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const startIso = localInputToIso(start);
    const endIso = localInputToIso(end);

    if (!startIso || !endIso) {
      setValidationError("Preencha início e fim do bloqueio.");
      return;
    }

    const result = BlockInput.safeParse({
      start: startIso,
      end: endIso,
      reason: reason || undefined,
    });

    if (!result.success) {
      setValidationError("Dados inválidos. Verifique as datas e tente novamente.");
      return;
    }

    // Validate end > start
    if (new Date(endIso) <= new Date(startIso)) {
      setValidationError("O fim do bloqueio deve ser depois do início.");
      return;
    }

    onSubmit(result.data);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border bg-white p-4"
      aria-label="Formulário de bloqueio"
    >
      <h3 className="text-sm font-semibold">Bloquear horário</h3>

      {validationError && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {validationError}
        </p>
      )}

      {isError && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          Não consegui criar o bloqueio. Tente de novo em instantes.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="block-start">Início</Label>
          <Input
            id="block-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            disabled={isPending}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="block-end">Fim</Label>
          <Input
            id="block-end"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            disabled={isPending}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="block-reason">Motivo (opcional)</Label>
        <Input
          id="block-reason"
          type="text"
          placeholder="Ex.: Almoço, reunião interna…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isPending}
          maxLength={120}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className={cn("bg-s4s-blue hover:bg-s4s-blue/90")}
        >
          {isPending ? "Salvando…" : "Bloquear"}
        </Button>
      </div>
    </form>
  );
}
