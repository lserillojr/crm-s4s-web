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
import { useOnboardingSessionPhone } from "@/components/onboarding/onboarding-session";
import {
  whatsappStepSchema,
  type WhatsappStepData,
} from "@/lib/wizard/schemas";
import { nextStepSlug } from "@/lib/wizard/steps";

/** Formata o telefone do cadastro (ex.: "+5511986148903") pro padrão BR
 * "(11) 98614-8903" usado no campo. Em formato inesperado devolve como veio. */
function formatarTelefoneBR(raw: string | null): string {
  if (!raw) return "";
  let d = raw.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2); // remove DDI +55
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

export default function WhatsappStepPage() {
  const router = useRouter();
  const stored = useWizardStore((s) => s.data.whatsapp);
  const setWhatsapp = useWizardStore((s) => s.setWhatsapp);
  const markCompleted = useWizardStore((s) => s.markCompleted);
  // Sugestão: número do cadastro (Keycloak), usado só se o MEI ainda não digitou.
  const sugestaoTelefone = useOnboardingSessionPhone();

  const form = useForm<WhatsappStepData>({
    resolver: zodResolver(whatsappStepSchema),
    defaultValues: {
      phoneNumber: stored.phoneNumber || formatarTelefoneBR(sugestaoTelefone),
      provider: stored.provider ?? "evolution",
      hasExistingNumber: stored.hasExistingNumber ?? true,
    },
  });

  const onSubmit = (values: WhatsappStepData) => {
    setWhatsapp(values);
    markCompleted("whatsapp");
    const next = nextStepSlug("whatsapp");
    if (next) router.push(`/wizard/${next}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qual número do WhatsApp você vai usar?</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do WhatsApp (com DDD)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(11) 99999-9999"
                      autoComplete="tel"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Esse é o número que vai aparecer pros seus clientes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasExistingNumber"
              render={({ field }) => (
                <FormItem className="rounded-md border p-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="mt-1 h-4 w-4"
                      aria-label="Já uso este número no WhatsApp pessoal"
                    />
                    <span className="text-sm">
                      <span className="font-medium">
                        Já uso este número no WhatsApp pessoal
                      </span>
                      <span className="block text-muted-foreground">
                        Usaremos Coexistence pra manter seu app pessoal
                        funcionando enquanto a IA atende.
                      </span>
                    </span>
                  </label>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Como conectar</FormLabel>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-accent">
                      <input
                        type="radio"
                        name="provider"
                        value="evolution"
                        checked={field.value === "evolution"}
                        onChange={() => field.onChange("evolution")}
                        className="mt-1"
                      />
                      <span className="text-sm">
                        <span className="font-medium">Pareamento por QR Code</span>
                        <span className="block text-muted-foreground">
                          Mais rápido — pronto em segundos. Recomendado.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-accent">
                      <input
                        type="radio"
                        name="provider"
                        value="cloud_api"
                        checked={field.value === "cloud_api"}
                        onChange={() => field.onChange("cloud_api")}
                        className="mt-1"
                      />
                      <span className="text-sm">
                        <span className="font-medium">
                          WhatsApp Oficial (Meta)
                        </span>
                        <span className="block text-muted-foreground">
                          Mais robusto, mas leva ~5 dias pra aprovação Meta.
                        </span>
                      </span>
                    </label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <WizardActions currentSlug="whatsapp" />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
