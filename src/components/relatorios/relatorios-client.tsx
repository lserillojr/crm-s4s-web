"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRelatoriosSummary } from "@/lib/relatorios/use-relatorios-summary";
import {
  fraseConversas,
  fraseTempoResposta,
  fraseAgendados,
  fraseOndeTrava,
  fraseForaHorario,
  frasePico,
} from "@/lib/relatorios/frases";
import { NumeroCard } from "./numero-card";

const PERIODOS = [7, 30] as const;

/**
 * Painel "Resumo" (Ag-1b): seletor de período + grid de números curados, cada um
 * virando frase em linguagem MEI. Container simples — preparado para virar abas na
 * fase 2 (aba "Detalhado" embutida, gated por flag). Ver spec §3/§4.
 */
export function RelatoriosClient() {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, isError } = useRelatoriosSummary(days);

  return (
    <div className="space-y-6">
      <div className="flex gap-2" role="group" aria-label="Período">
        {PERIODOS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            aria-pressed={days === d}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition",
              days === d
                ? "bg-s4s-blue text-white"
                : "border text-muted-foreground hover:bg-muted",
            )}
          >
            {d} dias
          </button>
        ))}
      </div>

      {isLoading && (
        <p role="status" className="text-muted-foreground">
          Carregando seus números…
        </p>
      )}
      {isError && (
        <p role="alert" className="text-muted-foreground">
          Não foi possível carregar os relatórios agora. Tente atualizar a página.
        </p>
      )}

      {data && (
        <section
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          aria-label="Resumo dos relatórios"
        >
          <NumeroCard
            destaque={String(data.ia.conversasAtendidas)}
            frase={fraseConversas(data.ia.conversasAtendidas)}
          />
          <NumeroCard
            destaque={`${data.ia.tempoRespostaSegundos}s`}
            frase={fraseTempoResposta(data.ia.tempoRespostaSegundos)}
          />
          <NumeroCard
            destaque={String(data.agenda.agendados)}
            frase={fraseAgendados(data.agenda.agendados)}
          />
          <NumeroCard
            destaque={data.funil.etapaTrava ?? "—"}
            frase={fraseOndeTrava(data.funil.etapaTrava, data.funil.motivoPerdaTop)}
          />
          {data.ia.foraHorario != null && data.ia.foraHorario > 0 && (
            <NumeroCard
              destaque={String(data.ia.foraHorario)}
              frase={fraseForaHorario(data.ia.foraHorario)}
            />
          )}
          <NumeroCard
            destaque={data.pico ? data.pico.diaSemana : "—"}
            frase={frasePico(data.pico)}
          />
        </section>
      )}
    </div>
  );
}
