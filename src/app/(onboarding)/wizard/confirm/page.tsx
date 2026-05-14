"use client";

import { useState } from "react";
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
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { WizardActions } from "@/components/wizard/wizard-actions";
import { useWizardStore } from "@/lib/wizard/store";
import {
  confirmStepSchema,
  type ConfirmStepData,
  VERTICALS,
} from "@/lib/wizard/schemas";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default function ConfirmStepPage() {
  const router = useRouter();
  const data = useWizardStore((s) => s.data);
  const hydrated = useWizardStore((s) => s.hydrated);
  const setConfirm = useWizardStore((s) => s.setConfirm);
  const markCompleted = useWizardStore((s) => s.markCompleted);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ConfirmStepData>({
    resolver: zodResolver(confirmStepSchema),
    defaultValues: { acceptTerms: data.confirm.acceptTerms ?? false },
  });

  const verticalLabel =
    VERTICALS.find((v) => v.value === data.kb.vertical)?.label ??
    data.kb.vertical ??
    "—";

  const onSubmit = async (values: ConfirmStepData) => {
    setConfirm(values);
    markCompleted("confirm");
    setSubmitting(true);
    // Submit real virá em SP2 fase 2 (Auth.js OIDC + POST onboarding endpoint).
    // Por enquanto, mock submit → vai pra dashboard.
    await new Promise((r) => setTimeout(r, 600));
    router.push("/dashboard");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tudo pronto pra ativar?</CardTitle>
      </CardHeader>
      <CardContent>
        {!hydrated ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="mb-4 rounded-md border p-3">
              <Row
                label="WhatsApp"
                value={data.whatsapp.phoneNumber || "—"}
              />
              <Row
                label="Provider"
                value={
                  data.whatsapp.provider === "cloud_api"
                    ? "Cloud API"
                    : "QR Code (Evolution)"
                }
              />
              <Row
                label="Instagram"
                value={
                  data.instagram.connect
                    ? data.instagram.instagramHandle || "(conectar depois)"
                    : "Pular por agora"
                }
              />
              <Row
                label="Google Calendar"
                value={data.calendar.connect ? "Conectar" : "Pular"}
              />
              <Row label="Negócio" value={data.kb.businessName || "—"} />
              <Row label="Setor" value={verticalLabel} />
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-1 h-4 w-4"
                            aria-label="Aceito termos"
                          />
                          <span className="text-sm">
                            Aceito os{" "}
                            <a
                              href="/termos"
                              target="_blank"
                              rel="noreferrer"
                              className="text-s4s-blue hover:underline"
                            >
                              termos de uso
                            </a>{" "}
                            e a{" "}
                            <a
                              href="/privacidade"
                              target="_blank"
                              rel="noreferrer"
                              className="text-s4s-blue hover:underline"
                            >
                              política de privacidade
                            </a>
                            .
                          </span>
                        </label>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <WizardActions
                  currentSlug="confirm"
                  isSubmitting={submitting}
                />
              </form>
            </Form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
