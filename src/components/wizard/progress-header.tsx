"use client";

import { usePathname } from "next/navigation";
import { WIZARD_STEPS, type WizardStepSlug } from "@/lib/wizard/steps";
import { cn } from "@/lib/utils";

/**
 * Header com 5 bolinhas + label "Etapa N de 5".
 * Lê o slug ativo da URL `/wizard/{slug}`.
 */
export function ProgressHeader() {
  const pathname = usePathname();
  const activeSlug = pathname.split("/").pop() as WizardStepSlug | undefined;
  const activeIdx = WIZARD_STEPS.findIndex((s) => s.slug === activeSlug);
  const currentIdx = activeIdx >= 0 ? activeIdx : 0;
  // WIZARD_STEPS é não-vazio + currentIdx bounded; fallback no [0] cobre TS.
  const current = WIZARD_STEPS[currentIdx] ?? WIZARD_STEPS[0];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Etapa {currentIdx + 1} de {WIZARD_STEPS.length}
        </span>
        <span className="font-medium text-foreground">{current.title}</span>
      </div>
      <div className="flex gap-1" role="list" aria-label="Progresso do wizard">
        {WIZARD_STEPS.map((step, i) => (
          <div
            key={step.slug}
            role="listitem"
            aria-current={i === currentIdx ? "step" : undefined}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= currentIdx ? "bg-s4s-blue" : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{current.description}</p>
    </div>
  );
}
