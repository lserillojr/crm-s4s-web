import { redirect } from "next/navigation";
import { WIZARD_STEPS } from "@/lib/wizard/steps";

/**
 * `/wizard` redireciona pro primeiro step. Quando Auth chegar (SP2 fase 2),
 * vamos ler `users.onboarding_state` pra retomar do step que parou.
 */
export default function WizardIndex() {
  redirect(`/wizard/${WIZARD_STEPS[0].slug}`);
}
