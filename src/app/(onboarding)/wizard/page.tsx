import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOnboardingState } from "@/lib/onboarding/server-state";
import { WIZARD_STEPS } from "@/lib/wizard/steps";

/**
 * `/wizard` decide pra onde retomar:
 * - Se o onboarding_state server-side já tem `auditId` (provisionamento
 *   disparado) → vai pra tela de provisionamento (sobrevive a limpar
 *   localStorage; critério #4 da spec SP4).
 * - Senão → primeiro step. (A hidratação fina dos dados por-step é feita pelo
 *   OnboardingStateSync no client.)
 *
 * O gate de autenticação é do middleware; aqui `auth()` pode vir nula em
 * borda (ex: build) — nesse caso cai no primeiro step sem consultar o DB.
 */
export const dynamic = "force-dynamic";

export default async function WizardIndex() {
  const session = await auth();
  const email = session?.user?.email;

  let auditId: string | undefined;
  if (email) {
    try {
      const state = await getOnboardingState(email);
      auditId = state?.auditId;
    } catch {
      // DB indisponível — segue pro primeiro step (resume é best-effort; a
      // sessão já foi validada pelo middleware, então o user não fica perdido).
    }
  }

  if (auditId) {
    redirect(`/wizard/provisioning?audit_id=${encodeURIComponent(auditId)}`);
  }
  redirect(`/wizard/${WIZARD_STEPS[0].slug}`);
}
