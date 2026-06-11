"use client";

import { useEffect, useState } from "react";
import {
  followupConfigDefaults,
  followupConfigSchema,
  INTENSITIES,
  INTENSITY_LABELS,
  type FollowupConfig,
  type Intensity,
} from "@/lib/followup/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ENDPOINT = "/api/followup-config";

export function AcompanhamentoClient() {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState<FollowupConfig>(followupConfigDefaults);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch(ENDPOINT, { method: "GET" });
        const body = (await res.json()) as { config?: unknown };
        if (!active) return;
        const parsed = followupConfigSchema.safeParse(body.config);
        if (parsed.success) setValue(parsed.data);
      } finally {
        if (active) setMounted(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const patch = (p: Partial<FollowupConfig>) =>
    setValue((v) => ({ ...v, ...p }));

  const handleSave = async () => {
    setSubmitting(true);
    setStatus("idle");
    try {
      const parsed = followupConfigSchema.safeParse(value);
      if (!parsed.success) return setStatus("error");
      const res = await fetch(ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted)
    return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      {status === "saved" && (
        <div
          role="status"
          className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900"
        >
          Pronto! Suas preferências de acompanhamento foram salvas.
        </div>
      )}
      {status === "error" && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          Não consegui salvar agora — tente de novo em instantes.
        </div>
      )}

      {/* MODO LEIGO */}
      <Card>
        <CardHeader>
          <CardTitle>Acompanhar clientes que sumiram</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              data-testid="toggle-enabled"
              checked={value.enabled}
              onChange={(e) => patch({ enabled: e.target.checked })}
            />
            <span className="text-sm">
              Deixe a IA mandar uma mensagem amigável para quem parou de
              responder ou não compareceu — sem você precisar lembrar.
            </span>
          </label>

          {value.enabled && (
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              data-testid="intensity-cards"
            >
              {INTENSITIES.map((opt: Intensity) => (
                <button
                  key={opt}
                  type="button"
                  data-testid={`intensity-${opt}`}
                  onClick={() => patch({ intensity: opt })}
                  className={`rounded-md border p-3 text-left text-sm ${
                    value.intensity === opt
                      ? "border-s4s-blue bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="font-medium">
                    {INTENSITY_LABELS[opt].titulo}
                  </div>
                  <div className="text-muted-foreground">
                    {INTENSITY_LABELS[opt].desc}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODO AVANÇADO */}
      {value.enabled && (
        <details className="rounded-md border border-gray-200 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Opções avançadas
          </summary>
          <div className="mt-4 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Quais acompanhamentos ligar
              </legend>
              {(
                [
                  ["followup_enabled", "Quem parou de responder"],
                  ["noshow_enabled", "Quem não compareceu ao horário"],
                  [
                    "nutricao_enabled",
                    "Reativar clientes antigos (30/60/90 dias)",
                  ],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    data-testid={`track-${key}`}
                    checked={value[key]}
                    onChange={(e) =>
                      patch({
                        [key]: e.target.checked,
                      } as Partial<FollowupConfig>)
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  data-testid="toggle-qualquer-hora"
                  checked={!value.respeitar_horario}
                  onChange={(e) =>
                    patch({ respeitar_horario: !e.target.checked })
                  }
                />
                Enviar a qualquer hora (ignorar meu horário de atendimento)
              </label>
              {!value.respeitar_horario && (
                <p
                  role="alert"
                  data-testid="aviso-invasivo"
                  className="rounded-md border border-yellow-300 bg-yellow-50 p-2 text-xs text-yellow-900"
                >
                  ⚠️ Atenção: assim a IA pode mandar mensagem de madrugada (ex.:
                  2h da manhã) em seu nome. A maioria dos clientes prefere
                  receber dentro do horário comercial.
                </p>
              )}
            </div>
          </div>
        </details>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={submitting}
          className="bg-s4s-blue hover:bg-s4s-blue/90"
        >
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
