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
import { Input } from "@/components/ui/input";
import { WizardActions } from "@/components/wizard/wizard-actions";
import { useWizardStore } from "@/lib/wizard/store";
import {
  kbStepSchema,
  type KbStepData,
  VERTICALS,
} from "@/lib/wizard/schemas";
import { nextStepSlug } from "@/lib/wizard/steps";

export default function KbStepPage() {
  const router = useRouter();
  const stored = useWizardStore((s) => s.data.kb);
  const setKb = useWizardStore((s) => s.setKb);
  const markCompleted = useWizardStore((s) => s.markCompleted);

  const form = useForm<KbStepData>({
    resolver: zodResolver(kbStepSchema),
    defaultValues: {
      businessName: stored.businessName ?? "",
      vertical: stored.vertical ?? "beleza",
      about: stored.about ?? "",
    },
  });

  const about = form.watch("about") ?? "";

  const onSubmit = (values: KbStepData) => {
    setKb(values);
    markCompleted("kb");
    const next = nextStepSlug("kb");
    if (next) router.push(`/wizard/${next}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conte pra IA sobre o seu negócio</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do negócio</FormLabel>
                  <FormControl>
                    <Input placeholder="Salão da Maria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vertical"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setor</FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {VERTICALS.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription>
                    A gente usa pra começar com um template de KB ajustado pro
                    seu setor.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O que a IA precisa saber</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Atendo cortes femininos, escova e coloração no centro de São Paulo. Horário comercial seg-sex 9h-19h. Cores de mecha custam R$ 180..."
                      rows={6}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="flex justify-between">
                    <span>
                      Serviços, preços, horários, tom — você ajusta depois.
                    </span>
                    <span
                      className={
                        about.length < 40
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {about.length}/40 min
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <WizardActions currentSlug="kb" />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
