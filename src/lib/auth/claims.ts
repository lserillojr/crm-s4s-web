import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

/** Objeto portador dos claims customizados (profile OIDC ou user do mock). */
export interface ClaimSource {
  tenant_id?: string | null;
  role?: string;
  phone_number?: string | null;
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
  };
}

/** Expõe os claims do token na sessão consumida pela app. */
export function mapSession(session: Session, token: JWT): Session {
  session.user.tenantId = (token.tenantId as string | null) ?? null;
  session.user.role = (token.role as string) ?? "owner";
  session.user.phoneNumber = token.phoneNumber as string | undefined;
  return session;
}
