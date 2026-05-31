"use client";

import { useEffect, useState } from "react";
import { getSsoTargets } from "@/lib/sso-targets";

/**
 * Pré-aquece a sessão SSO de Chatwoot/Odoo no 1º load do shell, carregando os
 * endpoints de início SSO em iframes ocultos. Como o MEI já tem sessão Keycloak
 * (acabou de logar no portal), o redirect SSO é silencioso e deixa o cookie de
 * sessão do produto pronto — assim os iframes visíveis (Atendimento/Funil) abrem
 * direto no conteúdo, sem tela de login dentro do frame. Uma vez por sessão.
 */
export function PrewarmSso() {
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("s4s_sso_warm") === "1") return;
    sessionStorage.setItem("s4s_sso_warm", "1");
    setWarm(true);
  }, []);

  if (!warm) return null;

  const targets = getSsoTargets();
  return (
    <div aria-hidden="true" style={{ display: "none" }} data-testid="sso-prewarm">
      {targets.chatwoot && <iframe title="prewarm-chatwoot" src={targets.chatwoot} />}
      {targets.odoo && <iframe title="prewarm-odoo" src={targets.odoo} />}
    </div>
  );
}
