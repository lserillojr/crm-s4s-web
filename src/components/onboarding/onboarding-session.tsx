"use client";

import { createContext, useContext } from "react";

/**
 * Disponibiliza dados da sessão (server-side) para os componentes client do
 * onboarding de forma SÍNCRONA — diferente do store, que hidrata via effect
 * assíncrono e chegaria tarde demais pro `defaultValues` do form.
 *
 * Hoje carrega só o telefone do cadastro (Keycloak `phone_number`), usado como
 * sugestão no campo "Número do WhatsApp" da etapa 1 (feedback Anselmo).
 */
const OnboardingSessionContext = createContext<{ phoneNumber: string | null }>({
  phoneNumber: null,
});

export function OnboardingSessionProvider({
  phoneNumber,
  children,
}: {
  phoneNumber: string | null;
  children: React.ReactNode;
}) {
  return (
    <OnboardingSessionContext.Provider value={{ phoneNumber }}>
      {children}
    </OnboardingSessionContext.Provider>
  );
}

/** Telefone do cadastro (sessão), ou null se ausente. */
export function useOnboardingSessionPhone(): string | null {
  return useContext(OnboardingSessionContext).phoneNumber;
}
