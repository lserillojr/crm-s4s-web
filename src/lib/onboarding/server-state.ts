import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { ProvisionStatus } from "@/lib/onboarding/contract";
import type { WizardData } from "@/lib/wizard/schemas";

/**
 * Forma do JSONB `users.onboarding_state`. Espelha o wizard (Zustand) + o
 * estado de provisionamento. Persistido server-side pra sobreviver a limpar
 * o localStorage (critério de teste #4 da spec SP4).
 */
export interface OnboardingState {
  data?: WizardData;
  furthestCompletedStep?: string | null;
  idempotencyKey?: string;
  auditId?: string;
  lastStatus?: ProvisionStatus;
  updatedAt?: string;
}

/** Lê o onboarding_state do user (keyed por lower(email)). null se ausente. */
export async function getOnboardingState(email: string): Promise<OnboardingState | null> {
  const key = email?.trim();
  if (!key) return null;
  const rows = (await db.execute(sql`
    SELECT onboarding_state FROM users WHERE lower(email) = lower(${key}) LIMIT 1
  `)) as unknown as Array<{ onboarding_state: OnboardingState | null }>;
  const state = rows[0]?.onboarding_state;
  return state ?? null;
}

/**
 * Merge raso do `patch` no onboarding_state atual e persiste. Devolve o estado
 * mesclado. Fail-closed sem email (não há chave de identidade).
 */
export async function saveOnboardingState(
  email: string,
  patch: Partial<OnboardingState>,
): Promise<OnboardingState> {
  const key = email?.trim();
  if (!key) throw new Error("saveOnboardingState: email ausente — não há chave de identidade.");
  const current = (await getOnboardingState(key)) ?? {};
  const merged: OnboardingState = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.execute(sql`
    UPDATE users
       SET onboarding_state = ${JSON.stringify(merged)}::jsonb, updated_at = now()
     WHERE lower(email) = lower(${key})
  `);
  return merged;
}
