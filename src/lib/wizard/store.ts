/**
 * Zustand store do wizard de onboarding.
 *
 * Persistido em localStorage (chave `s4s-wizard-v1`) pra permitir o MEI
 * retomar do step que parou. Versão na chave porque se o schema mudar
 * (steps adicionados/removidos), Zustand persist tem migration callback.
 *
 * Server components NÃO importam direto — só client components ("use client").
 * Hidratação inicial usa `useWizardStoreHydration` pra evitar mismatch SSR.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type WizardData,
  wizardDefaults,
  type WhatsappStepData,
  type InstagramStepData,
  type CalendarStepData,
  type KbStepData,
  type ConfirmStepData,
} from "./schemas";

interface WizardState {
  data: WizardData;
  // Slug do último step completado com sucesso. null = nenhum ainda.
  // Usado pra UI mostrar "Continue de onde parou" e pra bloquear navegação
  // direta pra steps que ainda não tiveram pré-requisito.
  furthestCompletedStep: string | null;
  // E-mail do dono dos dados persistidos. O localStorage é por-navegador (chave
  // global), então sem isto os dados de uma conta vazariam pra outra ao trocar
  // de conta no mesmo navegador. `ensureOwner` reseta quando o dono muda.
  ownerEmail: string | null;
  hydrated: boolean;

  setWhatsapp: (data: WhatsappStepData) => void;
  setInstagram: (data: InstagramStepData) => void;
  setCalendar: (data: CalendarStepData) => void;
  setKb: (data: KbStepData) => void;
  setConfirm: (data: ConfirmStepData) => void;

  markCompleted: (stepSlug: string) => void;
  reset: () => void;
  // Garante que os dados persistidos pertencem ao `email` da sessão atual.
  // Se o dono for outro (ou desconhecido), reseta antes de seguir — evita que o
  // nome do negócio (etc.) de uma conta apareça no wizard de outra no mesmo
  // navegador. A fonte autoritativa por e-mail é o onboarding_state server-side,
  // que reidrata em seguida (via OnboardingStateSync).
  ensureOwner: (email: string) => void;
  setHydrated: (v: boolean) => void;
  hydrateFromServer: (payload?: {
    data?: WizardData;
    furthestCompletedStep?: string | null;
  }) => void;
}

const STORAGE_KEY = "s4s-wizard-v1";

/**
 * Storage defensivo: usa localStorage real quando disponível, senão Map.
 * Cobre SSR (window undefined) e ambientes de teste onde Vitest+jsdom
 * pode não expor localStorage com setItem callable.
 */
function getSafeStorage() {
  if (
    typeof window !== "undefined" &&
    window.localStorage &&
    typeof window.localStorage.setItem === "function"
  ) {
    return window.localStorage;
  }
  const mem = new Map<string, string>();
  return {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  };
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      data: wizardDefaults,
      furthestCompletedStep: null,
      ownerEmail: null,
      hydrated: false,

      setWhatsapp: (data) =>
        set((s) => ({ data: { ...s.data, whatsapp: data } })),
      setInstagram: (data) =>
        set((s) => ({ data: { ...s.data, instagram: data } })),
      setCalendar: (data) =>
        set((s) => ({ data: { ...s.data, calendar: data } })),
      setKb: (data) => set((s) => ({ data: { ...s.data, kb: data } })),
      setConfirm: (data) =>
        set((s) => ({ data: { ...s.data, confirm: data } })),

      markCompleted: (stepSlug) =>
        set({ furthestCompletedStep: stepSlug }),
      reset: () =>
        set({
          data: wizardDefaults,
          furthestCompletedStep: null,
          ownerEmail: null,
        }),
      ensureOwner: (email) =>
        set((s) => {
          if (s.ownerEmail === email) return {};
          // Dono diferente (ou desconhecido): descarta os dados locais — eles são
          // de outra conta. O onboarding_state do `email` reidrata na sequência.
          return {
            data: wizardDefaults,
            furthestCompletedStep: null,
            ownerEmail: email,
          };
        }),
      setHydrated: (v) => set({ hydrated: v }),
      hydrateFromServer: (payload) =>
        set((s) => {
          if (!payload) return {};
          return {
            data: payload.data
              ? {
                  whatsapp: { ...s.data.whatsapp, ...(payload.data.whatsapp ?? {}) },
                  instagram: { ...s.data.instagram, ...(payload.data.instagram ?? {}) },
                  calendar: { ...s.data.calendar, ...(payload.data.calendar ?? {}) },
                  kb: { ...s.data.kb, ...(payload.data.kb ?? {}) },
                  confirm: { ...s.data.confirm, ...(payload.data.confirm ?? {}) },
                }
              : s.data,
            furthestCompletedStep:
              payload.furthestCompletedStep !== undefined
                ? payload.furthestCompletedStep
                : s.furthestCompletedStep,
          };
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(getSafeStorage),
      partialize: (state) => ({
        data: state.data,
        furthestCompletedStep: state.furthestCompletedStep,
        ownerEmail: state.ownerEmail,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
      },
    }
  )
);
