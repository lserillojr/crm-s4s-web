"use client";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
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
 * busca extra. A casca (overlay, Escape, clique-fora) vem do Modal.
 */
export function ContactPopover({ name, email, phone, onClose }: Props) {
  const copy = (v: string) => void navigator.clipboard?.writeText(v);

  return (
    <Modal onClose={onClose} ariaLabel="Dados do contato" widthClass="max-w-sm">
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
    </Modal>
  );
}
