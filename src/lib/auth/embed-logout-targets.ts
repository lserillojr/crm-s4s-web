/**
 * URLs que o NAVEGADOR (não o servidor) deve visitar para encerrar as sessões
 * das ferramentas embutidas no portal. dev-app/dev-backoffice/dev-chat são
 * subdomínios same-site de staff4solutions.com.br, então um GET disparado pelo
 * navegador (iframe) envia o cookie de sessão (SameSite=Lax) e o limpa.
 *
 * Por que isto existe: o "Sair" só fazia logout do NextAuth + Keycloak; os
 * clients Keycloak `odoo`/`chatwoot` não têm logout URL (front nem back-channel)
 * e o `auth_oauth` do Odoo não implementa back-channel logout. Resultado: a
 * sessão do Odoo/Chatwoot sobrevivia e o iframe reusava a sessão antiga.
 */
function cleanBase(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:"
      ? v.replace(/\/+$/, "")
      : null;
  } catch {
    return null;
  }
}

/** Odoo: GET /web/session/logout limpa o cookie `session_id` (validado em DEV). */
export function odooLogoutUrl(odooBase: string): string {
  return `${odooBase.replace(/\/+$/, "")}/web/session/logout?redirect=/web/login`;
}

/**
 * Chatwoot: não há GET de logout nativo (Devise usa DELETE /auth/sign_out).
 * Carregar /app/login força o SPA a revalidar a sessão; combinado ao logout do
 * Keycloak (SSO) o reacesso exige re-login. Endpoint a CONFIRMAR no smoke — se
 * não limpar `_chatwoot_session`, trocar por mecanismo dedicado (follow-up).
 */
export function chatwootLogoutUrl(chatwootBase: string): string {
  return `${chatwootBase.replace(/\/+$/, "")}/app/login`;
}

export interface EmbedLogoutTargets {
  odoo: string | null;
  chatwoot: string | null;
}

export function getEmbedLogoutTargets(bases: {
  odoo: string | undefined;
  chatwoot: string | undefined;
}): EmbedLogoutTargets {
  const odoo = cleanBase(bases.odoo);
  const chatwoot = cleanBase(bases.chatwoot);
  return {
    odoo: odoo ? odooLogoutUrl(odoo) : null,
    chatwoot: chatwoot ? chatwootLogoutUrl(chatwoot) : null,
  };
}
