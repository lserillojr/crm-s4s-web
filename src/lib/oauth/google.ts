/**
 * Helpers puros para o OAuth 2.0 do Google Calendar.
 * Não acessa Request/Response — só monta URLs, faz fetch e mapeia.
 * Toda interação com banco fica em src/lib/db/gcal-tokens.ts.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export interface BuildGoogleAuthUrlOpts {
  state: string;
  prompt?: "consent" | "none";
  scopes?: string[];
}

export function buildGoogleAuthUrl(opts: BuildGoogleAuthUrlOpts): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", requireEnv("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", requireEnv("GOOGLE_REDIRECT_URI"));
  url.searchParams.set("scope", (opts.scopes ?? DEFAULT_SCOPES).join(" "));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", opts.prompt ?? "consent");
  url.searchParams.set("state", opts.state);
  return url.toString();
}

export interface GoogleTokens {
  refresh_token?: string;
  access_token: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  let json: { error?: string; error_description?: string } & Partial<GoogleTokens>;
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new Error(`google_token_error: http_${res.status}_non_json`);
  }
  if (json.error) {
    throw new Error(
      `google_token_error: ${json.error}${json.error_description ? `: ${json.error_description}` : ""}`,
    );
  }
  if (!res.ok || !json.access_token) {
    throw new Error(`google_token_error: http_${res.status}_no_token`);
  }
  return json as GoogleTokens;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
}

export async function listCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const res = await fetch(`${GOOGLE_API_BASE}/users/me/calendarList`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`google_list_calendars_failed: ${res.status}`);
  const json = (await res.json()) as { items?: GoogleCalendar[] };
  const items = json.items ?? [];
  return [...items].sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
}

export async function createTestEvent(
  accessToken: string,
  calendarId: string,
): Promise<{ eventId: string }> {
  const start = new Date(Date.now() + 60_000).toISOString();
  const end = new Date(Date.now() + 120_000).toISOString();
  const res = await fetch(
    `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        summary: "✅ CRM-S4S conectado",
        description:
          "Evento criado pra confirmar o acesso ao seu calendário. Será removido automaticamente.",
        start: { dateTime: start },
        end: { dateTime: end },
      }),
    },
  );
  if (!res.ok) throw new Error(`google_event_create_failed: ${res.status}`);
  const json = (await res.json()) as { id: string };
  return { eventId: json.id };
}

/**
 * Deleta um evento. Rejeita com `google_event_delete_failed: <status>` quando a API
 * retorna HTTP de erro — o caller decide se silencia (`.catch(() => {})` no fluxo do
 * verification event do callback) ou propaga (testes/smokes diretos).
 */
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(
    `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok && res.status !== 410) {
    throw new Error(`google_event_delete_failed: ${res.status}`);
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Sua sessão expirou. Tente conectar de novo.",
  token_exchange_failed: "O Google não aceitou a autorização. Tente de novo.",
  no_refresh_token:
    "Você já tinha conectado antes. Acesse myaccount.google.com → Permissões, revoga o acesso do CRM-S4S e tente de novo.",
  insufficient_scope:
    "Você precisa autorizar acesso ao Calendar. Tente de novo e marque todas as permissões.",
  event_create_failed:
    "Conexão funcionou mas a criação do evento de teste falhou. Confira se o calendário existe.",
  list_calendars_failed: "Não consegui listar seus calendários. Tente de novo.",
  internal: "Algo deu errado por aqui. Tente de novo em alguns segundos.",
};

const INTERNAL_ERROR = ERROR_MESSAGES.internal as string;

export function mapGoogleError(code: string): string {
  return ERROR_MESSAGES[code] ?? INTERNAL_ERROR;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`env_missing: ${name}`);
  return v;
}
