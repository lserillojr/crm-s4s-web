"use client";

/**
 * Wrapper client da página /settings/working-hours (Story 7.6 fase 2).
 *
 * Persiste no backend via proxy autenticado /api/working-hours:
 *   - mount → GET  carrega o horário do Chatwoot do tenant (degrada pra defaults
 *     + aviso se o backend não respondeu — `loaded:false`).
 *   - salvar → PUT grava no Chatwoot. O save NÃO degrada em silêncio: se falhar,
 *     o MEI vê erro e tenta de novo (working_hours filtra os slots da IA).
 *
 * Substitui o rascunho localStorage da fase 1.
 */
import { useEffect, useState } from "react";
import {
  weeklyHoursDefaults,
  weeklyHoursSchema,
  type WeeklyHours,
} from "@/lib/working-hours/schema";
import { WorkingHoursForm } from "@/components/working-hours-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ENDPOINT = "/api/working-hours";

type SaveStatus = "idle" | "saved" | "error";

export function WorkingHoursClient() {
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(true);
  const [value, setValue] = useState<WeeklyHours>(weeklyHoursDefaults);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch(ENDPOINT, { method: "GET" });
        const body = (await res.json()) as {
          weeklyHours?: unknown;
          loaded?: boolean;
        };
        if (!active) return;
        const parsed = weeklyHoursSchema.safeParse(body.weeklyHours);
        if (parsed.success) setValue(parsed.data);
        setLoaded(res.ok && body.loaded === true);
      } catch {
        if (active) setLoaded(false);
      } finally {
        if (active) setMounted(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (): Promise<void> => {
    setSubmitting(true);
    setStatus("idle");
    try {
      const parsed = weeklyHoursSchema.safeParse(value);
      if (!parsed.success) {
        setStatus("error");
        return;
      }
      const res = await fetch(ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("saved");
      setLoaded(true);
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {mounted && !loaded && (
        <div
          role="status"
          className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900"
        >
          Não consegui carregar seu horário agora — mostrando o padrão. Você
          pode ajustar e salvar; vou sincronizar com o WhatsApp/Chatwoot.
        </div>
      )}

      {status === "saved" && (
        <div
          role="status"
          className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900"
        >
          Horário salvo. A partir de agora a IA só oferece horários dentro do
          seu atendimento.
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          Não consegui salvar — verifique os horários informados e tente de novo
          em instantes.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Horário de atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          {mounted ? (
            <div className="space-y-4">
              <WorkingHoursForm
                value={value}
                onChange={setValue}
                disabled={submitting}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={submitting}
                  className="bg-s4s-blue hover:bg-s4s-blue/90"
                >
                  {submitting ? "Salvando..." : "Salvar horário"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
