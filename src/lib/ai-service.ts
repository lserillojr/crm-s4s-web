/**
 * Canal autenticado web → FastAPI (crm-s4s-ai / AgendaService).
 *
 * Diferente do `callAiService` (src/lib/api/ai-service.ts) que aponta pro n8n
 * com `x-ai-service-token`, este cliente aponta para o FastAPI canônico do
 * módulo de agenda usando `x-agenda-secret`. Usado a partir da Onda 2, quando
 * a verdade dos slots migra para o nosso storage gerenciado pelo AgendaService.
 *
 * Vars de ambiente necessárias:
 *   AI_SERVICE_BASE_URL — ex: https://dev-ai.staff4solutions.com.br
 *   AI_SERVICE_SECRET   — segredo compartilhado entre o web e o FastAPI
 */

const BASE = process.env.AI_SERVICE_BASE_URL;
const SECRET = process.env.AI_SERVICE_SECRET;

export async function callAgendaService(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (!BASE || !SECRET) throw new Error("AI_SERVICE_BASE_URL/SECRET ausentes");
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-agenda-secret": SECRET,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}
