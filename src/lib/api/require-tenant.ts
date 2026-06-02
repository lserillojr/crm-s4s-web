import { auth } from "@/auth";
import { getTenantIdByEmail } from "@/lib/auth/onboarding-guard";

/**
 * Auth gate para rotas /api (Route Handlers): garante uma sessão com `tenantId`
 * ou devolve um 401 JSON padronizado. Diferente de `requireSession()` (lib/session),
 * que redireciona — útil só em Server Components, não em rotas /api.
 *
 * O `tenantId` do JWT fica defasado logo após o provisionamento: o token é
 * cunhado no login, antes de o claim existir no Keycloak, e o Auth.js só recopia
 * claims num novo sign-in. Pra não dar 401 no painel logo após ativar a conta,
 * quando o token vem sem tenant consultamos a fonte autoritativa (banco) antes
 * de recusar. O caminho com tenant na sessão não toca o banco.
 *
 * Uso:
 *   const ctx = await requireApiTenant();
 *   if ("response" in ctx) return ctx.response;   // 401 — short-circuit
 *   // ...usa ctx.tenantId / ctx.userName
 */

export type ApiTenant = { tenantId: string; userName: string };
export type RequireApiTenantResult = ApiTenant | { response: Response };

export async function requireApiTenant(): Promise<RequireApiTenantResult> {
  const session = await auth();
  let tenantId = session?.user?.tenantId ?? null;
  if (!tenantId && session?.user?.email) {
    try {
      tenantId = await getTenantIdByEmail(session.user.email);
    } catch {
      tenantId = null; // DB indisponível → trata como sem tenant (401).
    }
  }
  if (!tenantId) {
    return {
      response: Response.json(
        { error: "unauth" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  return { tenantId, userName: session?.user?.name ?? "" };
}
