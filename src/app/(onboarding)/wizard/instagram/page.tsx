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
  instagramStepSchema,
  type InstagramStepData,
} from "@/lib/wizard/schemas";
import { nextStepSlug } from "@/lib/wizard/steps";

export default function InstagramStepPage() {
  const router = useRouter();
  const stored = useWizardStore((s) => s.data.instagram);
  const setInstagram = useWizardStore((s) => s.setInstagram);
  const markCompleted = useWizardStore((s) => s.markCompleted);

  const form = useForm<InstagramStepData>({
    resolver: zodResolver(instagramStepSchema),
    defaultValues: {
      connect: stored.connect ?? false,
      instagramHandle: stored.instagramHandle ?? "",
    },
  });

  const connect = form.watch("connect");

  const onSubmit = (values: InstagramStepData) => {
    setInstagram(values);
    markCompleted("instagram");
    const next = nextStepSlug("instagram");
    if (next) router.push(`/wizard/${next}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quer atender DMs do Instagram também?</CardTitle>
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
                      aria-label="Sim, quero conectar Instagram"
                    />
                    <span className="text-sm">
                      <span className="font-medium">
                        Sim, quero conectar Instagram
                      </span>
                      <span className="block text-muted-foreground">
                        IA responde DMs e comentários no Insta com o mesmo
                        tom. Você pode adicionar depois também.
                      </span>
                    </span>
                  </label>
                </FormItem>
              )}
            />

            {connect && (
              <FormField
                control={form.control}
                name="instagramHandle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>@ do seu Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="@seu_negocio" {...field} />
                    </FormControl>
                    <FormDescription>
                      Você vai autenticar pelo Meta no próximo passo (depois
                      de criar a conta).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!connect && (
              <p className="text-sm text-muted-foreground">
                Sem problema — você pode conectar depois no painel.
              </p>
            )}

            <WizardActions currentSlug="instagram" />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
