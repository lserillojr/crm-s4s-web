"use client";

import Link from "next/link";
import { MessageSquare, Briefcase, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSsoTargets, type SsoTargets } from "@/lib/sso-targets";

type Item = {
  key: keyof SsoTargets;
  href: string | null;
  label: string;
  icon: LucideIcon;
};

/**
 * Atalhos de SSO pras ferramentas do MEI (Chatwoot/Odoo). Entram logado, sem 2a
 * senha (identidade pre-linkada na Fase 1). Usado na tela de sucesso do
 * onboarding (card). URL ausente: mostra botao desabilitado (discoverable).
 * (O header do dashboard nao usa mais SSO _blank — virou o App Shell com sidebar
 * + iframes; ver components/shell.)
 */
export function SsoLaunchers({
  targets = getSsoTargets(),
}: {
  targets?: SsoTargets;
}) {
  const items: Item[] = [
    { key: "chatwoot", href: targets.chatwoot, label: "Abrir meu atendimento", icon: MessageSquare },
    { key: "odoo", href: targets.odoo, label: "Abrir meu backoffice", icon: Briefcase },
  ];

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
