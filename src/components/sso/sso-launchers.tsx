"use client";

import Link from "next/link";
import { MessageSquare, Briefcase, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSsoTargets, type SsoTargets } from "@/lib/sso-targets";

type Variant = "card" | "nav";

type Item = {
  key: keyof SsoTargets;
  href: string | null;
  label: string;
  icon: LucideIcon;
};

/**
 * Atalhos de SSO pras ferramentas do MEI (Chatwoot/Odoo). Entram logado, sem 2a
 * senha (identidade pre-linkada na Fase 1). Reusado na tela de sucesso (card) e
 * no header do dashboard (nav). URL ausente: card mostra botao desabilitado
 * (discoverable); nav omite (header limpo).
 */
export function SsoLaunchers({
  targets = getSsoTargets(),
  variant = "card",
}: {
  targets?: SsoTargets;
  variant?: Variant;
}) {
  const items: Item[] = [
    { key: "chatwoot", href: targets.chatwoot, label: "Abrir meu atendimento", icon: MessageSquare },
    { key: "odoo", href: targets.odoo, label: "Abrir meu backoffice", icon: Briefcase },
  ];

  if (variant === "nav") {
    return (
      <>
        {items.map(({ key, href, label, icon: Icon }) =>
          href ? (
            <Link
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-s4s-blue hover:underline"
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </Link>
          ) : null,
        )}
      </>
    );
  }

  return (
    <div className="space-y-2" data-testid="sso-launchers">
      {items.map(({ key, href, label, icon: Icon }) =>
        href ? (
          <Button key={key} asChild variant="outline" className="w-full justify-start gap-2">
            <Link href={href} target="_blank" rel="noopener noreferrer">
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </Link>
          </Button>
        ) : (
          <Button
            key={key}
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            disabled
            title="Indisponível neste ambiente"
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </Button>
        ),
      )}
    </div>
  );
}
