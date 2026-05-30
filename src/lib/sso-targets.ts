/**
 * URLs de iniciacao SSO das ferramentas do MEI, montadas a partir de env vars
 * publicas (NEXT_PUBLIC_*). Funcoes puras (recebem o base url) + leitura das
 * env vars isolada em getSsoTargets, pra testabilidade.
 *
 * Chatwoot: rota same-origin /sso/openid_connect/start (vive na imagem custom
 * crm-s4s-chatwoot; faz o POST+CSRF que o OmniAuth exige). Odoo: login page
 * com o botao nativo "Keycloak S4S" (OCA auth_oidc).
 */

export interface SsoTargets {
  chatwoot: string | null;
  odoo: string | null;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Normaliza um base url vindo de env var: trim + exige URL http(s) absoluta.
 * Valor ausente/vazio OU malformado (ex: `localhost`, `not-a-url`, path
 * relativo) vira `null` — o launcher degrada pra desabilitado/omitido em vez
 * de gerar um href silenciosamente quebrado.
 */
function cleanBase(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  if (v.length === 0) return null;
  try {
    const parsed = new URL(v);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? v : null;
  } catch {
    return null;
  }
}

export function chatwootSsoUrl(baseUrl: string): string {
  return `${stripTrailingSlash(baseUrl)}/sso/openid_connect/start`;
}

export function odooSsoUrl(baseUrl: string): string {
  return `${stripTrailingSlash(baseUrl)}/web/login`;
}

export function getSsoTargets(): SsoTargets {
  // Acesso direto a process.env.NEXT_PUBLIC_* — o Next inlineia no build do client.
  const chatwootBase = cleanBase(process.env.NEXT_PUBLIC_CHATWOOT_URL);
  const odooBase = cleanBase(process.env.NEXT_PUBLIC_ODOO_URL);
  return {
    chatwoot: chatwootBase ? chatwootSsoUrl(chatwootBase) : null,
    odoo: odooBase ? odooSsoUrl(odooBase) : null,
  };
}
