"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
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

export default function CalendarStepPage() {
  const router = useRouter();
  const stored = useWizardStore((s) => s.data.calendar);
  const setCalendar = useWizardStore((s) => s.setCalendar);
  const markCompleted = useWizardStore((s) => s.markCompleted);

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

  // A conexão do Google é feita LOGO APÓS criar a conta (tela de "Tudo pronto"),
  // não aqui: durante o wizard ainda não existe tenant pra guardar os tokens.
  // Este passo só captura o fuso horário (usado pra calcular os slots).
  const onSubmit = (values: CalendarStepData) => {
    setCalendar({ ...values, connected: false, skipped: false });
    markCompleted("calendar");
    const next = nextStepSlug("calendar");
    if (next) router.push(`/wizard/${next}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>IA pode marcar reuniões na sua agenda?</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-md border border-s4s-blue/30 bg-s4s-blue/5 p-3 text-sm text-muted-foreground">
              Você conecta seu Google Calendar{" "}
              <span className="font-medium text-foreground">
                logo depois de criar a conta
              </span>{" "}
              — assim a IA marca reuniões direto na sua agenda. Por enquanto, só
              confirme seu fuso horário.
            </div>

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
