"use client";

import { useEffect, useRef } from "react";
import { useWizardStore } from "@/lib/wizard/store";
import { loadServerState, saveServerState } from "@/lib/onboarding/client";

/**
 * Ponte invisível entre o store (Zustand/localStorage) e o onboarding_state
 * server-side. Montado no layout de onboarding.
 *
 * - Mount: puxa o estado do server (sobrevive a limpar localStorage — critério
 *   de teste #4 da spec SP4) e hidrata o store.
 * - Mudanças no store: write-through debounced (800ms) pro server.
 *
 * O `loadedRef` evita o write-through disparar com o estado inicial antes da
 * hidratação ter rodado (senão sobrescreveria o server com defaults vazios).
 */
export function OnboardingStateSync({
  sessionEmail = null,
}: {
  /** E-mail da sessão atual (do layout server). Usado pra isolar o store por
   *  dono: se o localStorage for de outra conta, `ensureOwner` reseta antes de
   *  hidratar — sem isto o nome do negócio vazaria entre contas no mesmo
   *  navegador. */
  sessionEmail?: string | null;
} = {}) {
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // ANTES de hidratar: garante que os dados locais são desta conta. Se forem
      // de outra (troca de conta no mesmo navegador), descarta — o server-state
      // por e-mail reidrata o correto logo abaixo.
      if (sessionEmail) {
        useWizardStore.getState().ensureOwner(sessionEmail);
      }
      const state = await loadServerState();
      if (!cancelled && state) {
        useWizardStore.getState().hydrateFromServer({
          data: state.data,
          furthestCompletedStep: state.furthestCompletedStep,
        });
      }
      // Marca pós-await: garante que a assinatura (2º effect) nunca veja `true`
      // antes de loadServerState resolver. Setado mesmo se state===null, pra que
      // usuário novo (sem estado no server) também ative o write-through.
      // Janela de corrida = RTT de 1 GET; edits nessa janela não sincronizam (best-effort).
      loadedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionEmail]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useWizardStore.subscribe((s) => {
      if (!loadedRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void saveServerState({
          data: s.data,
          furthestCompletedStep: s.furthestCompletedStep,
        });
      }, 800);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);

  return null;
}
