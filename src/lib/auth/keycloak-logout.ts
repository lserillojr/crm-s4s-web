/**
 * Monta a URL de logout federado (RP-Initiated Logout) do Keycloak.
 *
 * O `signOut()` do Auth.js só limpa o cookie LOCAL — a sessão SSO do Keycloak
 * continua viva, então o próximo login entra direto (sem pedir senha) e os
 * embeds (Odoo/Chatwoot) reusam a sessão. Redirecionar pro `end_session` do
 * Keycloak termina a sessão SSO; como os clients `odoo` e `chatwoot` têm
 * `backchannel.logout.session.required=true`, o Keycloak ainda desloga ambos
 * por back-channel (Single Logout).
 *
 * Usa `client_id` + `post_logout_redirect_uri` (já registrado no client
 * `web-simples` como `${appBaseUrl}/login`); com o uri válido o Keycloak desloga
 * e redireciona sem página de confirmação. Devolve `null` se faltar config
 * Keycloak — aí o caller cai no logout local simples.
 */
export function buildKeycloakLogoutUrl(opts: {
  issuer: string | undefined;
  clientId: string | undefined;
  appBaseUrl: string;
}): string | null {
  if (!opts.issuer || !opts.clientId) return null;
  const issuer = opts.issuer.replace(/\/+$/, "");
  const appBase = opts.appBaseUrl.replace(/\/+$/, "");
  const url = new URL(`${issuer}/protocol/openid-connect/logout`);
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("post_logout_redirect_uri", `${appBase}/login`);
  return url.toString();
}
