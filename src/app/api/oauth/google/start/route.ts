import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { auth } from "@/auth";
import { getTenantIdByEmail } from "@/lib/auth/onboarding-guard";
import { buildGoogleAuthUrl } from "@/lib/oauth/google";

/**
 * Origem canônica pra construir URLs de redirect. `req.url` dentro do container
 * resolve pra `http://0.0.0.0:3000/...` (proxy reverso não reescreve), o que
 * vaza no Location: do Response.redirect. AUTH_URL é o env já usado pelo
 * Auth.js v5 — reaproveitamos como source of truth.
 */
function getOrigin(req: NextRequest): string {
  return process.env.AUTH_URL ?? req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  // Resolve o tenant pela fonte autoritativa: a conexão do Google acontece logo
  // APÓS o provisionamento, quando o token ainda está defasado (tenantId=null).
  const tenantId =
    session?.user?.tenantId ??
    (session?.user?.email ? await getTenantIdByEmail(session.user.email) : null);
  if (!tenantId) {
    return Response.redirect(new URL("/login?next=/dashboard", getOrigin(req)));
  }

  const url = new URL(req.url);
  // returnTo é armazenado no cookie SEM sanitização. A validação (path-relative,
  // sem javascript:, sem host externo) é responsabilidade do callback handler
  // antes de fazer o Response.redirect. Open-redirect aqui = na callback.
  const returnTo = url.searchParams.get("returnTo") ?? "/wizard/calendar";

  const state = crypto.randomBytes(32).toString("hex");
  const cookieStore = cookies();
  cookieStore.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/oauth/google/callback",
    maxAge: 600,
  });
  cookieStore.set("gcal_oauth_return_to", returnTo, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/oauth/google/callback",
    maxAge: 600,
  });

  return Response.redirect(buildGoogleAuthUrl({ state }));
}
