"use client";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Chamado no Escape, no clique fora (overlay) e quando o conteúdo aciona fechar. */
  onClose: () => void;
  /** Rótulo acessível do diálogo (lido por leitores de tela). */
  ariaLabel: string;
  /** Largura máxima do card. Default: max-w-md. */
  widthClass?: string;
  children: React.ReactNode;
}

/**
 * Shell de modal central estilo "agenda do Google": overlay esmaecido, card
 * centralizado, fecha no Escape e no clique fora. É só a casca — o conteúdo
 * (título, ✕/Cancelar, campos) vem dos filhos. Extraído do padrão do
 * ContactPopover para ser reusado pelos forms/painel da agenda.
 */
export function Modal({ onClose, ariaLabel, widthClass = "max-w-md", children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          "max-h-[90vh] w-full space-y-3 overflow-y-auto rounded-lg border bg-white p-5 shadow-lg",
          widthClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
