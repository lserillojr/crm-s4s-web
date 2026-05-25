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
export function OnboardingStateSync() {
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await loadServerState();
      if (!cancelled && state) {
        useWizardStore.getState().hydrateFromServer({
          data: state.data,
          furthestCompletedStep: state.furthestCompletedStep,
        });
      }
      loadedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
