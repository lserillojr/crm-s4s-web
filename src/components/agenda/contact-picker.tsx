"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContactSearch } from "@/lib/agenda/use-agenda";
import type { ContactSuggestion } from "@/lib/agenda/contract";

interface Props {
  value: string;
  onChange: (name: string) => void;
  onPick: (c: ContactSuggestion) => void;
  onCreateNew: (name: string) => void;
  disabled: boolean;
}

export function ContactPicker({ value, onChange, onPick, onCreateNew, disabled }: Props) {
  const [open, setOpen] = useState(false);
  // `typed` tracks the live input value independently from the controlled `value` prop.
  // This is necessary because the component is controlled (parent owns `value`) but the
  // dropdown visibility must react to what the user is actively typing — not to the
  // prop value at render time. When the parent passes an initial `value` (e.g. "Zez"),
  // we seed `typed` from it so existing values appear correctly.
  const [typed, setTyped] = useState(value);
  // Mudanças EXTERNAS do `value` (ex.: onPick seta o nome escolhido no form) refletem
  // no input. Quando o usuário digita, value já == typed, então o efeito é no-op.
  useEffect(() => { setTyped(value); }, [value]);

  const { data: suggestions = [], isFetching } = useContactSearch(typed);
  const show = open && typed.trim().length >= 3;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setTyped(v);
    onChange(v);
    setOpen(true);
  }

  return (
    <div className="space-y-1">
      <Label htmlFor="appt-contact">Cliente</Label>
      <div className="relative">
        <Input
          id="appt-contact"
          type="text"
          placeholder="Nome do cliente"
          value={typed}
          autoComplete="off"
          disabled={disabled}
          maxLength={120}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
        />
        {show && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white text-sm shadow">
            {suggestions.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-s4s-blue/5"
                  onClick={() => {
                    onPick(c);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{c.name}</span>
                  {c.email && (
                    <span className="ml-2 text-xs text-muted-foreground">{c.email}</span>
                  )}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-s4s-blue hover:bg-s4s-blue/5"
                onClick={() => {
                  onCreateNew(typed);
                  setOpen(false);
                }}
              >
                {isFetching ? "Buscando…" : `+ criar novo contato "${typed}"`}
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
