import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { buildProvisionPayload } from "@/lib/onboarding/contract";
import { n8nProvision } from "@/lib/onboarding/n8n-client";
import { getOnboardingState, saveOnboardingState } from "@/lib/onboarding/server-state";
import type { WizardData } from "@/lib/wizard/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dispara o provisionamento async. A `X-API-KEY` do n8n vive só aqui
 * (server-side) — nunca chega ao browser. A `idempotency_key` é estável por
 * tentativa: gravada no onboarding_state e reusada em re-submits (replay 200).
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { wizard?: WizardData };
  if (!body.wizard) {
    return NextResponse.json({ error: "missing_wizard_data" }, { status: 400 });
  }

  let prior: Awaited<ReturnType<typeof getOnboardingState>> = null;
  try {
    prior = await getOnboardingState(email);
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  const idempotencyKey = prior?.idempotencyKey ?? randomUUID();

  const origin = new URL(req.url).origin;
  const payload = buildProvisionPayload({
    wizard: body.wizard,
    user: { email, name: session.user.name ?? null },
    idempotencyKey,
    magicLinkRedirectUrl: `${origin}/dashboard`,
  });

  let result: Awaited<ReturnType<typeof n8nProvision>>;
  try {
    result = await n8nProvision(payload);
  } catch {
    return NextResponse.json({ error: "provision_unavailable" }, { status: 502 });
  }
  const { status, body: n8nBody } = result;

  // 2xx = aceito/replay. Persiste o vínculo (idempotency + audit) pra polling/resume.
  if (status === 200 || status === 202) {
    try {
      await saveOnboardingState(email, {
        idempotencyKey,
        auditId: n8nBody.audit_id,
        lastStatus: n8nBody.status,
      });
    } catch {
      // n8n já aceitou; persistir falhou. NÃO derruba o request — o cliente
      // precisa do audit_id pra pollar. Re-submit regenera a key se preciso.
      console.error("[provision] saveOnboardingState falhou após 2xx do n8n");
    }
  }

  return NextResponse.json(n8nBody, { status });
}
