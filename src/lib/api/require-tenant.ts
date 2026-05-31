import { auth } from "@/auth";

/**
 * Auth gate para rotas /api (Route Handlers): garante uma sessão com `tenantId`
 * ou devolve um 401 JSON padronizado. Diferente de `requireSession()` (lib/session),
 * que redireciona — útil só em Server Components, não em rotas /api.
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
  const tenantId = session?.user?.tenantId;
  if (!tenantId) {
    return {
      response: Response.json(
        { error: "unauth" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  return { tenantId, userName: session.user?.name ?? "" };
}
