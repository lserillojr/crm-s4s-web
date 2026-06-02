import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

/** Objeto portador dos claims customizados (profile OIDC ou user do mock). */
export interface ClaimSource {
  tenant_id?: string | null;
  role?: string;
  phone_number?: string | null;
  /** `sub` OIDC do Keycloak (claim `sub` do profile). NÃO confundir com o
   * `token.sub` do NextAuth, que é um id interno e diverge do sub do Keycloak. */
  sub?: string | null;
}

/**
 * No primeiro login (quando `source` está presente) copia os claims
 * customizados do Keycloak pro token. Em refreshes (`source` undefined)
 * devolve o token sem mexer.
 */
export function mapJwtClaims(token: JWT, source?: ClaimSource): JWT {
  if (!source) return token;
  return {
    ...token,
    tenantId: source.tenant_id ? String(source.tenant_id) : null,
    role: typeof source.role === "string" && source.role ? source.role : "owner",
    phoneNumber: source.phone_number ? String(source.phone_number) : undefined,
    // Persiste o sub REAL do Keycloak. O `oauth_uid` no Odoo (SSO) é casado por
    // ESTE valor — não pelo token.sub do NextAuth, que não bate com o claim que
    // o Odoo valida no id_token. Ver provisionamento WF11 Step 2e.
    keycloakSub: source.sub ? String(source.sub) : undefined,
  };
}

/** Expõe os claims do token na sessão consumida pela app. */
export function mapSession(session: Session, token: JWT): Session {
  session.user.tenantId = (token.tenantId as string | null) ?? null;
  session.user.role = (token.role as string) ?? "owner";
  session.user.phoneNumber = token.phoneNumber as string | undefined;
  // Prefere o sub OIDC real do Keycloak; cai pro token.sub só como fallback
  // (mock/credentials, onde não há profile.sub).
  session.user.sub =
    (token.keycloakSub as string | undefined) ??
    (token.sub as string | undefined) ??
    undefined;
  return session;
}
