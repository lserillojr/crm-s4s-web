"use client";
import { useState } from "react";
import { BlockInput } from "@/lib/agenda/contract";
import { localInputToIso } from "@/lib/agenda/datetime";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/agenda/datetime-picker";
import { cn } from "@/lib/utils";

/**
 * Formulário (modal central) para criar um bloqueio de horário. Início e fim
 * independentes (cada um data + hora) — permite bloqueio de vários dias.
 * Converte datetime-local → ISO com offset local (datetime.ts) antes de enviar.
 */

interface BlockFormProps {
  isPending: boolean;
  isError: boolean;
  onSubmit: (input: BlockInput) => void;
  onCancel: () => void;
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

    if (new Date(endIso) <= new Date(startIso)) {
      setValidationError("O fim do bloqueio deve ser depois do início.");
      return;
    }

    onSubmit(result.data);
  };

  return (
    <Modal onClose={onCancel} ariaLabel="Formulário de bloqueio" widthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-3" aria-label="Formulário de bloqueio">
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
            <DateTimePicker id="block-start" value={start} onChange={setStart} disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="block-end">Fim</Label>
            <DateTimePicker id="block-end" value={end} onChange={setEnd} disabled={isPending} />
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
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={isPending} className={cn("bg-s4s-blue hover:bg-s4s-blue/90")}>
            {isPending ? "Salvando…" : "Bloquear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
