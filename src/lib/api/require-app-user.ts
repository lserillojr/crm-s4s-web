import { createRemoteJWKSet, jwtVerify } from "jose";
import { getPool } from "@/lib/db/pool";
import { getAppUserByEmail } from "@/lib/db/users";
import { env } from "@/lib/env";

/**
 * Guard Bearer para rotas consumidas pelo APP NATIVO. Diferente de requireApiTenant
 * (cookie NextAuth do Portal web): o app carrega o access_token do Keycloak.
 * Valida assinatura contra o JWKS do realm s4s, exige issuer + exp (jwtVerify checa
 * exp por padrão), extrai `email` (realm usa email como username; users não tem sub),
 * e resolve user+tenant no banco. NÃO checa `aud` (token Keycloak usa aud='account').
 */
export type AppUserCtx = { userId: string; tenantId: string };
export type RequireAppUserResult = AppUserCtx | { response: Response };

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks(issuer: string) {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
  return jwks;
}

function unauth(): { response: Response } {
  return { response: Response.json({ error: "unauth" }, { status: 401, headers: { "Cache-Control": "no-store" } }) };
}

export async function requireAppUser(req: Request): Promise<RequireAppUserResult> {
  const header = req.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return unauth();
  const issuer = env.AUTH_KEYCLOAK_ISSUER;
  if (!issuer) return unauth();

  let email: string | undefined;
  try {
    const { payload } = await jwtVerify(m[1]!, getJwks(issuer), { issuer });
    email = typeof payload.email === "string" ? payload.email : undefined;
  } catch {
    return unauth();
  }
  if (!email) return unauth();

  const user = await getAppUserByEmail(getPool(), email);
  if (!user || !user.tenantId) return unauth();
  return { userId: user.userId, tenantId: user.tenantId };
}
