"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { EmbedLogoutTargets } from "@/lib/auth/embed-logout-targets";

/**
 * "Sair" robusto: PRIMEIRO encerra as sessões dos embeds (Odoo/Chatwoot) via
 * iframes ocultos same-site, DEPOIS dispara o logout federado (NextAuth +
 * Keycloak end_session) recebido como `onFederatedLogout` (server action).
 *
 * Por que client-side: o cookie de sessão do Odoo/Chatwoot vive no NAVEGADOR;
 * um fetch/redirect server-side não o alcança. Como os domínios são same-site
 * (dev-app/dev-backoffice/dev-chat), o GET do iframe envia e limpa o cookie
 * (SameSite=Lax). Um timeout de segurança evita travar o logout se um embed
 * não responder.
 */
export function LogoutButton({
  targets,
  onFederatedLogout,
}: {
  targets: EmbedLogoutTargets;
  onFederatedLogout: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleClick() {
    if (busy) return;
    setBusy(true);

    const urls = [targets.odoo, targets.chatwoot].filter(Boolean) as string[];

    let called = false;
    const finish = () => {
      if (called) return;
      called = true;
      void onFederatedLogout();
    };

    if (urls.length === 0) {
      finish();
      return;
    }

    let pending = urls.length;
    // rede de segurança: não travar o "Sair" se um embed não carregar.
    const timer = setTimeout(finish, 1500);

    urls.forEach((u) => {
      const ifr = document.createElement("iframe");
      ifr.style.display = "none";
      ifr.setAttribute("data-embed-logout", "");
      ifr.onload = () => {
        pending -= 1;
        if (pending <= 0) {
          clearTimeout(timer);
          finish();
        }
      };
      ifr.src = u;
      containerRef.current?.appendChild(ifr);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-testid="logout"
        disabled={busy}
        onClick={handleClick}
      >
        Sair
      </Button>
      <div ref={containerRef} aria-hidden className="hidden" />
    </>
  );
}
