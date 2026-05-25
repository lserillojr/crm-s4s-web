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
  if (email) {
    const state = await getOnboardingState(email);
    if (state?.auditId) {
      redirect(`/wizard/provisioning?audit_id=${encodeURIComponent(state.auditId)}`);
    }
  }
  redirect(`/wizard/${WIZARD_STEPS[0].slug}`);
}
