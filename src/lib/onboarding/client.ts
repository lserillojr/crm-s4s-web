import type { ProvisionResult, StatusResult } from "@/lib/onboarding/contract";
import type { OnboardingState } from "@/lib/onboarding/server-state";
import type { WizardData } from "@/lib/wizard/schemas";

export interface SubmitProvisionResult {
  ok: boolean;
  status: number;
  result?: ProvisionResult;
}

/** Dispara o provisionamento via route handler interno (key fica no server). */
export async function submitProvision(wizard: WizardData): Promise<SubmitProvisionResult> {
  const resp = await fetch("/api/onboarding/provision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wizard }),
  });
  const result = (await resp.json().catch(() => undefined)) as ProvisionResult | undefined;
  return { ok: resp.ok, status: resp.status, result };
}

/** Busca o status atual do provisionamento. */
export async function fetchStatus(auditId: string): Promise<StatusResult> {
  const resp = await fetch(`/api/onboarding/status?audit_id=${encodeURIComponent(auditId)}`, {
    method: "GET",
  });
  return (await resp.json()) as StatusResult;
}

/** Lê o onboarding_state server-side. null se anônimo/ausente. */
export async function loadServerState(): Promise<OnboardingState | null> {
  const resp = await fetch("/api/onboarding/state", { method: "GET" });
  if (!resp.ok) return null;
  const json = (await resp.json().catch(() => ({}))) as { state?: OnboardingState | null };
  return json.state ?? null;
}

/** Grava (merge) o onboarding_state server-side. */
export async function saveServerState(patch: Partial<OnboardingState>): Promise<void> {
  await fetch("/api/onboarding/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}
