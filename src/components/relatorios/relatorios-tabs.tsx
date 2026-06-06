"use client";
import { Tabs } from "@/components/ui/tabs";
import { EmbeddedFrame } from "@/components/shell/embedded-frame";
import { RelatoriosClient } from "./relatorios-client";

/**
 * Container tabbed de /relatorios quando o tenant tem o Detalhado liberado.
 * "Resumo" = painel curado (intacto); "Detalhado" = seção Reports do Chatwoot
 * embutida. Montado pela page SÓ quando a flag está on.
 */
export function RelatoriosTabs({ detalhadoSrc }: { detalhadoSrc: string | null }) {
  return (
    <Tabs
      defaultValue="resumo"
      items={[
        { value: "resumo", label: "Resumo", content: <RelatoriosClient /> },
        {
          value: "detalhado",
          label: "Detalhado",
          content: (
            <div className="h-[70vh]">
              <EmbeddedFrame src={detalhadoSrc} title="Relatórios detalhados" />
            </div>
          ),
        },
      ]}
    />
  );
}
