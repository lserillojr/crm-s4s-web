"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  name: string | null;
  email: string | null;
  phone: string | null;
  onClose: () => void;
}

/**
 * Modal pequeno com os dados do contato vinculado ao agendamento (nome, e-mail,
 * telefone) + atalho pra ficha completa. Dados vêm do próprio agendamento — sem
 * busca extra. Fecha no Escape, no ✕ ou clicando fora.
 */
export function ContactPopover({ name, email, phone, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = (v: string) => void navigator.clipboard?.writeText(v);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dados do contato"
        className="w-full max-w-sm space-y-3 rounded-lg border bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold">{name ?? "Contato"}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
            ✕
          </Button>
        </div>

        {email && (
          <div className="flex items-center gap-2 text-sm">
            <span aria-hidden="true">✉</span>
            <a href={`mailto:${email}`} className="truncate text-s4s-blue underline">
              {email}
            </a>
            <Button type="button" size="sm" variant="outline" className="ml-auto shrink-0" onClick={() => copy(email)}>
              Copiar
            </Button>
          </div>
        )}

        {phone && (
          <div className="flex items-center gap-2 text-sm">
            <span aria-hidden="true">☎</span>
            <a href={`tel:${phone}`} className="text-s4s-blue underline">
              {phone}
            </a>
            <Button type="button" size="sm" variant="outline" className="ml-auto shrink-0" onClick={() => copy(phone)}>
              Copiar
            </Button>
          </div>
        )}

        {!email && !phone && (
          <p className="text-sm text-muted-foreground">Sem e-mail ou telefone cadastrados.</p>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/contatos" onClick={onClose}>
            Abrir ficha do contato
          </Link>
        </Button>
      </div>
    </div>
  );
}
