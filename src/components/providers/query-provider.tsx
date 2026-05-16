"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Provider raiz pra Tanstack Query.
 *
 * Mantido client-side (useState) pra que cada request crie um cliente fresh
 * no SSR e não vaze cache entre usuários — padrão recomendado do Tanstack
 * Query v5 com Next.js App Router.
 *
 * `staleTime` default = 60s combina com o que o dashboard pede (não rebuscar
 * a cada navegação curta — economiza chamadas no WF05 quando ele entrar).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
