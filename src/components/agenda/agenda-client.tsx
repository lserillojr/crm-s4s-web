"use client";
import { useMemo, useState } from "react";
import { useAgenda } from "@/lib/agenda/use-agenda";
import type { AgendaList } from "@/lib/agenda/contract";

/** Janela fixa da Onda 1: próximos 7 dias a partir de hoje (visual simples;
 * calendário rico fica para a Onda 2). */
function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

type Item =
  | { kind: "appt"; start: string; end: string; title: string; status: string }
  | { kind: "block"; start: string; end: string; title: string };

const fmtDia = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

type Grupo = { dia: string; label: string; itens: Item[] };

/** Agrupa agendamentos + bloqueios por dia (chave dd/mm/aaaa), ordenados no tempo. */
function agruparPorDia(data: AgendaList): Grupo[] {
  const itens: Item[] = [
    ...data.appointments.map(
      (a): Item => ({
        kind: "appt",
        start: a.start,
        end: a.end,
        title: a.contactName ?? "Cliente",
        status: a.status,
      }),
    ),
    ...data.blocks.map(
      (b): Item => ({
        kind: "block",
        start: b.start,
        end: b.end,
        title: b.reason ?? "Horário bloqueado",
      }),
    ),
  ].sort((x, y) => x.start.localeCompare(y.start));

  const grupos = new Map<string, Grupo>();
  for (const it of itens) {
    const dia = new Date(it.start).toLocaleDateString("pt-BR");
    const grupo = grupos.get(dia) ?? { dia, label: fmtDia(it.start), itens: [] };
    grupo.itens.push(it);
    grupos.set(dia, grupo);
  }
  return [...grupos.values()];
}

/**
 * Tela da Agenda (Onda 1 — só-leitura): lista os próximos compromissos do MEI,
 * agrupados por dia, em linguagem simples. Sem edição ainda (criar/cancelar
 * entram nas próximas ondas).
 */
export function AgendaClient() {
  const { from, to } = useMemo(defaultRange, []);
  const { data, isLoading, isError } = useAgenda(from, to);

  const grupos = useMemo(() => (data ? agruparPorDia(data) : []), [data]);

  return (
    <div className="space-y-6">
      {isLoading && (
        <p role="status" className="text-muted-foreground">
          Carregando sua agenda…
        </p>
      )}
      {isError && (
        <p role="alert" className="text-muted-foreground">
          Não foi possível carregar sua agenda agora. Tente atualizar a página.
        </p>
      )}

      {data && grupos.length === 0 && (
        <p className="text-muted-foreground">
          Você não tem compromissos nos próximos 7 dias.
        </p>
      )}

      {grupos.map((grupo) => (
        <section key={grupo.dia} aria-label={grupo.dia} className="space-y-2">
          <h2 className="font-heading text-lg font-semibold capitalize">
            {grupo.label}
          </h2>
          <ul className="space-y-2">
            {grupo.itens.map((it, i) => (
              <li
                key={`${grupo.dia}-${i}`}
                className="flex items-center gap-3 rounded-md border bg-white px-4 py-3"
              >
                <span className="font-mono text-sm text-s4s-blue">
                  {fmtHora(it.start)}–{fmtHora(it.end)}
                </span>
                <span className="flex-1">{it.title}</span>
                {it.kind === "block" ? (
                  <span className="rounded bg-s4s-gray-light px-2 py-0.5 text-xs text-muted-foreground">
                    bloqueio
                  </span>
                ) : it.status !== "confirmado" ? (
                  <span className="rounded bg-s4s-gray-light px-2 py-0.5 text-xs text-muted-foreground">
                    {it.status}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
