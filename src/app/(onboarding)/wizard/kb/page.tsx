"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ReactMarkdown from "react-markdown";
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
import { Button } from "@/components/ui/button";
import { WizardActions } from "@/components/wizard/wizard-actions";
import { useWizardStore } from "@/lib/wizard/store";
import {
  kbStepSchema,
  type KbStepData,
  VERTICALS,
} from "@/lib/wizard/schemas";
import { nextStepSlug } from "@/lib/wizard/steps";

/**
 * Templates iniciais de KB por vertical.
 *
 * São sugestões — não preenchem automático. O MEI clica em "Usar template"
 * pra evitar surpresa (texto sumindo se ele já tinha começado a escrever).
 * "outro" vive como string vazia + dica no preview placeholder.
 */
const KB_TEMPLATES: Record<string, string> = {
  beleza: `# Salão de Beleza

## Serviços e preços
- Corte feminino: R$ 80
- Escova: R$ 60
- Coloração: a partir de R$ 180

## Horário
Segunda a sexta 9h-19h, sábado 9h-13h. Domingo fechado.`,
  comercio_digital: `# Loja Online

## O que vendemos
Acessórios femininos artesanais — colares, brincos, anéis.

## Preços e prazo
Produtos R$ 30-150. Envio em até 3 dias úteis via Correios.`,
  artesanal: `# Produtos Artesanais

## Sobre
Faço sabonetes artesanais com ingredientes naturais.

## Preços
Sabonete R$ 15, kit com 3 R$ 40.`,
  ingles: `# Escola de Inglês

## Cursos oferecidos
- Conversação (R$ 200/mês)
- Preparatório IELTS (R$ 350/mês)

## Aulas
Online ou presencial em Pinheiros (SP).`,
  outro: "",
};

/** Label da vertical (pra rotular o botão "Usar template de X") */
function verticalLabel(value: string): string {
  return VERTICALS.find((v) => v.value === value)?.label ?? value;
}

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
  const vertical = form.watch("vertical") ?? "beleza";

  // Ref pro textarea pra focar depois de aplicar template.
  // Como o Controller injeta ref próprio, precisamos compor via callback
  // (assinar nosso ref + delegar pro field.ref do react-hook-form).
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyTemplate = () => {
    const tpl = KB_TEMPLATES[vertical] ?? "";
    // shouldDirty=true pra disparar flag "dirty" no form.
    // shouldValidate=true pra revalidar o min(40) imediatamente.
    form.setValue("about", tpl, {
      shouldDirty: true,
      shouldValidate: true,
    });
    textareaRef.current?.focus();
  };

  const canUseTemplate = about.trim().length === 0 && vertical !== "outro";

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

                  {canUseTemplate && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyTemplate}
                      >
                        Usar template de {verticalLabel(vertical)}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Você edita do jeito que quiser depois.
                      </span>
                    </div>
                  )}

                  {/*
                    Grid 2 colunas em md+ (editor + preview). O FormControl
                    fica como filho direto do grid pro Radix Slot copiar o
                    formItemId pro <textarea> diretamente (label associa OK).
                    Em mobile, preview some (hidden md:block) — só editor.
                  */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormControl>
                      <textarea
                        placeholder="Atendo cortes femininos, escova e coloração no centro de São Paulo. Horário comercial seg-sex 9h-19h. Cores de mecha custam R$ 180..."
                        rows={12}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        {...field}
                        ref={(el) => {
                          field.ref(el);
                          textareaRef.current = el;
                        }}
                      />
                    </FormControl>
                    <div
                      aria-label="Preview da KB"
                      data-testid="kb-preview"
                      className="hidden min-h-[180px] w-full rounded-md border border-dashed border-input bg-muted/30 px-3 py-2 text-sm md:block"
                    >
                      {about.trim().length > 0 ? (
                        <div className="prose prose-sm max-w-none break-words [&>h1]:mt-0 [&>h1]:text-base [&>h1]:font-semibold [&>h2]:text-sm [&>h2]:font-semibold [&>ul]:list-disc [&>ul]:pl-5">
                          <ReactMarkdown>{about}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Preview aparece aqui — use markdown:{" "}
                          <code># título</code>, <code>- listas</code>,{" "}
                          <code>**negrito**</code>.
                        </span>
                      )}
                    </div>
                  </div>

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

                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-s4s-blue hover:underline">
                      Como escrever uma boa KB?
                    </summary>
                    <div className="mt-2 rounded-md border bg-muted/30 p-3">
                      <p className="font-medium">Dicas pra uma boa KB</p>
                      <ul className="ml-5 mt-1 list-disc space-y-1 text-muted-foreground">
                        <li>
                          Liste seus serviços principais com preço (mesmo
                          aproximado)
                        </li>
                        <li>Mencione horário de atendimento</li>
                        <li>Diga onde você atende (cidade/bairro)</li>
                        <li>
                          Use <strong>negrito</strong> pra info crítica (ex:{" "}
                          <strong>não atendemos</strong> aos domingos)
                        </li>
                      </ul>
                    </div>
                  </details>

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
