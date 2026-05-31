/**
 * URLs de embed das ferramentas do MEI dentro do portal (iframe). Builders puros
 * (recebem a base url) + leitura das env vars isolada em getEmbedTargets, pra
 * testabilidade. Espelha sso-targets.ts (que é dos launchers _blank); aqui o
 * objetivo é o oposto: carregar DENTRO do portal com ?embed=s4s (contrato com as
 * imagens custom — modo chrome-off persistido por cookie).
 */
export interface EmbedTargets {
  atendimento: string | null;
  funil: string | null;
  contatos: string | null;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Igual ao cleanBase de sso-targets: exige URL http(s) absoluta, senão null. */
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

function withEmbed(url: string): string {
  return url.includes("?") ? `${url}&embed=s4s` : `${url}?embed=s4s`;
}

export function atendimentoUrl(chatwootBase: string): string {
  return withEmbed(`${stripTrailingSlash(chatwootBase)}/`);
}

export function funilUrl(odooBase: string): string {
  // Odoo 19 não expõe path "crm" (/odoo/crm dá 404). O pipeline do CRM só é
  // acessível pela action via xmlid. Contatos usa /odoo/contacts (path nativo).
  return withEmbed(
    `${stripTrailingSlash(odooBase)}/odoo/action-crm.crm_lead_action_pipeline`,
  );
}

export function contatosUrl(odooBase: string): string {
  return withEmbed(`${stripTrailingSlash(odooBase)}/odoo/contacts`);
}

export function getEmbedTargets(): EmbedTargets {
  const chatwootBase = cleanBase(process.env.NEXT_PUBLIC_CHATWOOT_URL);
  const odooBase = cleanBase(process.env.NEXT_PUBLIC_ODOO_URL);
  return {
    atendimento: chatwootBase ? atendimentoUrl(chatwootBase) : null,
    funil: odooBase ? funilUrl(odooBase) : null,
    contatos: odooBase ? contatosUrl(odooBase) : null,
  };
}
