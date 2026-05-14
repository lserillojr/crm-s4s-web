"use client";

import { useRouter } from "next/navigation";
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
    },
  });

  const onSubmit = (values: CalendarStepData) => {
    setCalendar(values);
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
            <FormField
              control={form.control}
              name="connect"
              render={({ field }) => (
                <FormItem className="rounded-md border p-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="mt-1 h-4 w-4"
                      aria-label="Conectar Google Calendar"
                    />
                    <span className="text-sm">
                      <span className="font-medium">
                        Conectar Google Calendar
                      </span>
                      <span className="block text-muted-foreground">
                        Quando o cliente pergunta &quot;que horas você
                        atende?&quot;, a IA olha sua agenda e oferece horários
                        que você está livre.
                      </span>
                    </span>
                  </label>
                </FormItem>
              )}
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
