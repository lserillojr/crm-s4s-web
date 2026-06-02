import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getTenantIdByEmail } from "@/lib/auth/onboarding-guard";
import {
  exchangeCodeForTokens,
  listCalendars,
  createTestEvent,
  deleteEvent,
} from "@/lib/oauth/google";
import { saveEncryptedToken } from "@/lib/db/gcal-tokens";
import { getPool } from "@/lib/db/pool";

/**
 * Sanitiza returnTo do cookie (untrusted). Aceita só paths relativos seguros.
 * Bloqueia: protocol-relative (//x), data:, javascript:, vazio, host externo.
 */
function safeReturnTo(value: string | undefined): string {
  const FALLBACK = "/wizard/calendar";
  if (!value) return FALLBACK;
  if (!value.startsWith("/")) return FALLBACK;
  if (value.startsWith("//") || value.startsWith("/\\")) return FALLBACK;
  // Bloqueia qualquer scheme suspeito embutido (defesa em profundidade)
  if (/^\/?(javascript|data|file|vbscript):/i.test(value)) return FALLBACK;
  return value;
}

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
  const url = new URL(req.url);
  const origin = getOrigin(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = cookies();
  const cookieState = cookieStore.get("gcal_oauth_state")?.value;
  const returnTo = safeReturnTo(cookieStore.get("gcal_oauth_return_to")?.value);

  cookieStore.delete("gcal_oauth_state");
  cookieStore.delete("gcal_oauth_return_to");

  const back = (params: Record<string, string>) => {
    const u = new URL(returnTo, origin);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    return Response.redirect(u);
  };

  if (!code || !state || state !== cookieState) {
    return back({ error: "invalid_state" });
  }

  const session = await auth();
  // Token defasado logo após o provisionamento → resolve o tenant pelo banco.
  const tenantId =
    session?.user?.tenantId ??
    (session?.user?.email ? await getTenantIdByEmail(session.user.email) : null);
  if (!tenantId) {
    return Response.redirect(new URL("/login", origin));
  }

  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch {
    return back({ error: "token_exchange_failed" });
  }

  if (!tokens.refresh_token) {
    return back({ error: "no_refresh_token" });
  }

  let calendars: Awaited<ReturnType<typeof listCalendars>>;
  try {
    calendars = await listCalendars(tokens.access_token);
  } catch {
    return back({ error: "list_calendars_failed" });
  }
  const primary = calendars.find((c) => c.primary) ?? calendars[0];
  if (!primary) return back({ error: "list_calendars_failed" });

  let evt: { eventId: string };
  try {
    evt = await createTestEvent(tokens.access_token, primary.id);
  } catch {
    return back({ error: "event_create_failed" });
  }
  // Deleta best-effort; falha aqui só vira warning.
  // NOTE: setTimeout não dispara em runtime serverless (Vercel free) — função é
  // congelada após response. Aceitável: evento fica na agenda do MEI até GC ou
  // próxima reconexão. Risco = cosmético, não vaza dado.
  setTimeout(() => {
    deleteEvent(tokens.access_token, primary.id, evt.eventId).catch(() => {});
  }, 5_000);

  const key = process.env.WIZARD_TOKEN_KEY;
  if (!key) return back({ error: "internal" });

  await saveEncryptedToken(getPool(), {
    tenantId,
    refreshToken: tokens.refresh_token,
    calendarId: primary.id,
    encryptionKey: key,
  });

  return back({ connected: "1", calendar_id: primary.id });
}
