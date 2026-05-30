"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { WizardActions } from "@/components/wizard/wizard-actions";
import {
  GcalConnectButton,
  type GcalConnectState,
} from "@/components/wizard/gcal-connect-button";
import { useWizardStore } from "@/lib/wizard/store";
import {
  calendarStepSchema,
  type CalendarStepData,
} from "@/lib/wizard/schemas";
import { nextStepSlug } from "@/lib/wizard/steps";

const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3) — Sul/Sudeste" },
  { value: "America/Manaus", label: "Manaus (GMT-4) — Amazonas/RO/RR" },
  { value: "America/Recife", label: "Recife (GMT-3) — Nordeste" },
  { value: "America/Belem", label: "Belém (GMT-3) — Pará/Amapá" },
] as const;

function deriveCalendarName(calId: string | null): string | null {
  if (!calId) return null;
  return calId === "primary" ? "Calendário principal" : calId;
}

function CalendarStepInner() {
  const router = useRouter();
  const search = useSearchParams();
  const stored = useWizardStore((s) => s.data.calendar);
  const setCalendar = useWizardStore((s) => s.setCalendar);
  const markCompleted = useWizardStore((s) => s.markCompleted);

  const [state, setState] = useState<GcalConnectState>(() => {
    if (stored.connected) return "connected";
    if (stored.skipped) return "skipped";
    return "idle";
  });
  const [calendarName, setCalendarName] = useState<string | null>(
    stored.calendarName ?? null
  );
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);

  const form = useForm<CalendarStepData>({
    resolver: zodResolver(calendarStepSchema),
    defaultValues: {
      connect: stored.connect ?? true,
      timezone: stored.timezone ?? "America/Sao_Paulo",
      connected: stored.connected ?? false,
      calendarId: stored.calendarId ?? null,
      calendarName: stored.calendarName ?? null,
      skipped: stored.skipped ?? false,
    },
  });

  // Pós-callback: lê ?connected=1 ou ?error=...
  useEffect(() => {
    const error = search.get("error");
    const connected = search.get("connected");
    if (error) {
      setState("error");
      setErrorCode(error);
      return;
    }
    if (connected === "1") {
      fetch("/api/tenant/me")
        .then((r) => r.json())
        .then((info: { calendarId: string | null; connected: boolean }) => {
          if (info.connected) {
            const calId =
              info.calendarId ?? search.get("calendar_id") ?? "primary";
            const name = deriveCalendarName(calId);
            setCalendar({
              ...form.getValues(),
              connected: true,
              calendarId: calId,
              calendarName: name,
              skipped: false,
            });
            setCalendarName(name);
            setState("connected");
          }
        })
        .catch(() => setState("error"));
    }
  // setCalendar é stable ref do Zustand selector; form.getValues() lê o ref atual
  // do RHF — nenhum risco de stale closure aqui. Effect roda apenas quando o
  // ?connected= ou ?error= muda na URL.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onSubmit = (values: CalendarStepData) => {
    setCalendar({
      ...values,
      connected: state === "connected",
      skipped: state === "skipped",
    });
    markCompleted("calendar");
    const next = nextStepSlug("calendar");
    if (next) router.push(`/wizard/${next}`);
  };

  const onSkip = () => {
    setState("skipped");
    setCalendar({ ...form.getValues(), connected: false, skipped: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>IA pode marcar reuniões na sua agenda?</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <GcalConnectButton
              state={state}
              calendarName={calendarName}
              errorCode={errorCode}
              onSkip={onSkip}
              returnTo="/wizard/calendar"
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu fuso horário</FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription>
                    Define em que horário os slots oferecidos serão calculados.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <WizardActions currentSlug="calendar" />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function CalendarStepPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>IA pode marcar reuniões na sua agenda?</CardTitle>
          </CardHeader>
          <CardContent>Carregando…</CardContent>
        </Card>
      }
    >
      <CalendarStepInner />
    </Suspense>
  );
}
