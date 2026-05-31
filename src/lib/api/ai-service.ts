import { env } from "@/lib/env";

/**
 * Proxy autenticado a um Workflow de dados do tenant no n8n (camada ai-service).
 *
 * Encapsula o padrão estabelecido em /api/dashboard/summary (7.5): resolve a base
 * + token `x-ai-service-token`, faz fetch com timeout e no-store, e CLASSIFICA a
 * falha — deixando o caller decidir a degradação por-feature (cards null, draft
 * local, etc). NÃO lança: rotas /api que consomem dados do tenant devem degradar,
 * nunca explodir 500 na cara do MEI.
 *
 * Reusado por: dashboard (7.5), KB persist (7.4), working-hours persist (7.6).
 */

const DEFAULT_TIMEOUT_MS = 8000;

export type AiServiceOk<T> = { ok: true; data: T };
export type AiServiceErr =
  | { ok: false; reason: "unconfigured" }
  | { ok: false; reason: "http"; status: number }
  | { ok: false; reason: "network"; isTimeout: boolean };
export type AiServiceResult<T> = AiServiceOk<T> | AiServiceErr;

export type CallAiServiceArgs = {
  /** Caminho do WF a partir da base (`N8N_API_BASE_URL`), ex: "/kb/api/v1/get". */
  path: string;
  /** Default "POST". WFs de leitura simples podem usar "GET" (sem body). */
  method?: "GET" | "POST" | "PUT";
  /** Corpo serializado como JSON. Omitido em GET. */
  body?: unknown;
  /** Timeout em ms (default 8000). */
  timeoutMs?: number;
};

export async function callAiService<T = unknown>(
  args: CallAiServiceArgs,
): Promise<AiServiceResult<T>> {
  const base = env.N8N_API_BASE_URL?.replace(/\/+$/, "");
  if (!base) {
    return { ok: false, reason: "unconfigured" };
  }
  const method = args.method ?? "POST";
  const token = env.N8N_AI_SERVICE_TOKEN ?? "";

  try {
    const resp = await fetch(`${base}${args.path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-ai-service-token": token },
      body: method === "GET" ? undefined : JSON.stringify(args.body ?? {}),
      cache: "no-store",
      signal: AbortSignal.timeout(args.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    if (!resp.ok) {
      return { ok: false, reason: "http", status: resp.status };
    }
    return { ok: true, data: (await resp.json()) as T };
  } catch (err) {
    return {
      ok: false,
      reason: "network",
      isTimeout: err instanceof Error && err.name === "TimeoutError",
    };
  }
}
