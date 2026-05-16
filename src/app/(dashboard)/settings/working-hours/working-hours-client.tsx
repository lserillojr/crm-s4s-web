"use client";

/**
 * Wrapper client da página /settings/working-hours.
 *
 * Mock fase 1: lê initial value de localStorage + persiste localStorage no
 * submit. Quando Auth + proxy Chatwoot existirem (SP2 fase 2 + SP3), troca
 * o handler por POST no proxy.
 *
 * Migrado em Story 7.6-DEV pra novo WorkingHoursForm controlado
 * (value/onChange em vez de initialValue/onSubmit).
 */
import { useEffect, useState } from "react";
import {
  weeklyHoursDefaults,
  weeklyHoursSchema,
  type WeeklyHours,
} from "@/lib/working-hours/schema";
import { WorkingHoursForm } from "@/components/working-hours-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STORAGE_KEY = "s4s-working-hours-draft-v1";

type SaveStatus = "idle" | "saved" | "error";

function loadFromStorage(): WeeklyHours {
  if (typeof window === "undefined") return weeklyHoursDefaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return weeklyHoursDefaults;
    const parsed = weeklyHoursSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    return weeklyHoursDefaults;
  } catch {
    return weeklyHoursDefaults;
  }
}

export function WorkingHoursClient() {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState<WeeklyHours>(weeklyHoursDefaults);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setValue(loadFromStorage());
    setMounted(true);
  }, []);

  const handleSave = (): void => {
    setSubmitting(true);
    setStatus("idle");
    try {
      const parsed = weeklyHoursSchema.safeParse(value);
      if (!parsed.success) {
        setStatus("error");
        return;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.data));
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="status"
        className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900"
      >
        Rascunho local — autenticação ainda não disponível. Suas mudanças
        ficam só nesse navegador até a conta ser ativada.
      </div>

      {status === "saved" && (
        <div
          role="status"
          className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900"
        >
          Rascunho salvo localmente. Quando sua conta estiver ativa, vai
          sincronizar com o WhatsApp/Chatwoot automaticamente.
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          Não consegui salvar — verifique os horários informados ou se o
          navegador permite localStorage (não funciona em modo anônimo).
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
                  onClick={handleSave}
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
