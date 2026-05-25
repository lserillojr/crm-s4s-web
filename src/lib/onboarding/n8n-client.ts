import { env } from "@/lib/env";
import type { ProvisionRequest } from "@/lib/onboarding/contract";

/** Resultado bruto de uma chamada ao n8n (status HTTP + body JSON). */
export interface N8nResponse<T = unknown> {
  status: number;
  body: T;
}

function baseUrl(): string {
  const base = env.N8N_API_BASE_URL;
  if (!base) {
    throw new Error(
      "N8N_API_BASE_URL não configurada — provisionamento indisponível. " +
        "Defina N8N_API_BASE_URL (até o segmento /webhook) e N8N_PROVISION_API_KEY.",
    );
  }
  return base.replace(/\/+$/, "");
}

function apiKey(): string {
  const key = env.N8N_PROVISION_API_KEY;
  if (!key) throw new Error("N8N_PROVISION_API_KEY não configurada — provisionamento indisponível.");
  return key;
}

/** POST /onboarding/provision. Não lança em erro HTTP — devolve status pro caller mapear. */
export async function n8nProvision(
  payload: ProvisionRequest,
): Promise<N8nResponse<Record<string, unknown>>> {
  const resp = await fetch(`${baseUrl()}/onboarding/provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey() },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return { status: resp.status, body: (await resp.json().catch(() => ({}))) as Record<string, unknown> };
}

/** GET /onboarding/status?audit_id=X. */
export async function n8nStatus(auditId: string): Promise<N8nResponse<Record<string, unknown>>> {
  const url = `${baseUrl()}/onboarding/status?audit_id=${encodeURIComponent(auditId)}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: { "X-API-KEY": apiKey() },
    cache: "no-store",
  });
  return { status: resp.status, body: (await resp.json().catch(() => ({}))) as Record<string, unknown> };
}
