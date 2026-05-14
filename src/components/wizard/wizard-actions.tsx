"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  prevStepSlug,
  nextStepSlug,
  type WizardStepSlug,
} from "@/lib/wizard/steps";

interface WizardActionsProps {
  currentSlug: WizardStepSlug;
  isSubmitting?: boolean;
  /**
   * Texto do botão de avanço.
   * Default "Continuar"; no último step troca pra "Ativar conta".
   */
  nextLabel?: string;
  /** Desabilita o botão de avançar (ex: form inválido) */
  nextDisabled?: boolean;
  /** Form submit: aciona o handleSubmit do react-hook-form se passado. Senão, navega direto. */
  onNext?: () => void;
}

export function WizardActions({
  currentSlug,
  isSubmitting = false,
  nextLabel,
  nextDisabled = false,
  onNext,
}: WizardActionsProps) {
  const router = useRouter();
  const prev = prevStepSlug(currentSlug);
  const next = nextStepSlug(currentSlug);
  const isLastStep = next === null;
  const label = nextLabel ?? (isLastStep ? "Ativar conta" : "Continuar");

  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="ghost"
        disabled={prev === null || isSubmitting}
        onClick={() => {
          if (prev !== null) router.push(`/wizard/${prev}`);
        }}
      >
        Voltar
      </Button>
      <Button
        type={onNext ? "button" : "submit"}
        disabled={nextDisabled || isSubmitting}
        onClick={onNext}
        className="bg-s4s-blue hover:bg-s4s-blue/90"
      >
        {isSubmitting ? "Salvando..." : label}
      </Button>
    </div>
  );
}
