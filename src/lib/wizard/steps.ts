/**
 * Definição dos 5 steps do wizard de onboarding.
 *
 * Ordem fixa: whatsapp → instagram → calendar → kb → confirm.
 * Slug usado nas URLs `/wizard/{slug}`. Index 1-based pra UI.
 *
 * Mapeamento Dev Tracker:
 * - whatsapp  → Story 7.9 (tutorial WA BYOW + QR Evolution)
 * - instagram → Story 5.4 (Instagram opcional)
 * - calendar  → Story 7.8 (Google Calendar OAuth)
 * - kb        → Story 4.2 (KB markdown — toolkit fase 0 entrega templates)
 * - confirm   → Story 7.11 (envio welcome email no submit final)
 */

export const WIZARD_STEPS = [
  {
    slug: "whatsapp",
    title: "WhatsApp",
    description: "Conecte o número que vai atender seus clientes",
  },
  {
    slug: "instagram",
    title: "Instagram",
    description: "Receber DMs do Instagram também — opcional",
  },
  {
    slug: "calendar",
    title: "Agenda",
    description: "Google Calendar pra IA marcar reuniões reais",
  },
  {
    slug: "kb",
    title: "Seu negócio",
    description: "O que a IA precisa saber pra responder seu cliente",
  },
  {
    slug: "confirm",
    title: "Pronto",
    description: "Revise e ative sua conta",
  },
] as const;

export type WizardStepSlug = (typeof WIZARD_STEPS)[number]["slug"];

export const WIZARD_STEP_SLUGS = WIZARD_STEPS.map((s) => s.slug);

export function stepIndex(slug: WizardStepSlug): number {
  return WIZARD_STEPS.findIndex((s) => s.slug === slug);
}

export function nextStepSlug(slug: WizardStepSlug): WizardStepSlug | null {
  const idx = stepIndex(slug);
  const next = WIZARD_STEPS[idx + 1];
  return next ? next.slug : null;
}

export function prevStepSlug(slug: WizardStepSlug): WizardStepSlug | null {
  const idx = stepIndex(slug);
  if (idx <= 0) return null;
  const prev = WIZARD_STEPS[idx - 1];
  return prev ? prev.slug : null;
}
