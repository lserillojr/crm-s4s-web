"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { KbMarkdownField } from "@/components/kb/kb-markdown-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";

type KbSection = { key: string; title: string; editable: boolean; content: string };
type KbResp = { sections: KbSection[]; hasPrevious: boolean; updatedAt: string | null };

async function fetchKb(): Promise<KbResp> {
  const r = await fetch("/api/kb", { cache: "no-store" });
  if (!r.ok) throw new Error(`kb ${r.status}`);
  return r.json();
}
async function saveKb(editable: Record<string, string>) {
  const r = await fetch("/api/kb", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ editable }) });
  if (!r.ok) throw new Error(`save ${r.status}`);
  return r.json();
}

export function KbClient() {
  const q = useQuery({ queryKey: ["kb"], queryFn: fetchKb });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const m = useMutation({ mutationFn: saveKb, onSuccess: () => q.refetch() });

  useEffect(() => {
    if (q.data) {
      const d: Record<string, string> = {};
      q.data.sections.filter((s) => s.editable).forEach((s) => (d[s.key] = s.content));
      setDrafts(d);
    }
  }, [q.data]);

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (q.isError)
    return (
      <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
        Não consegui carregar sua base de conhecimento. Tente recarregar a página.
      </div>
    );

  const sections = q.data!.sections;
  return (
    <div className="space-y-4">
      <div role="note" className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
        Você edita as informações do seu negócio. As seções de atendimento e funil são configuradas pela equipe S4S para a IA conduzir as vendas corretamente.
      </div>
      {m.isSuccess && (
        <div role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          Base de conhecimento salva. A IA passa a usar nos próximos atendimentos.
        </div>
      )}
      {m.isError && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          Não consegui salvar. Tente de novo em instantes.
        </div>
      )}
      {sections.map((s) => (
        <Card key={s.key}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {s.title}
              {!s.editable && (
                <span className="rounded bg-s4s-gray-light px-2 py-0.5 text-xs font-normal text-s4s-gray-dark" title="Controla o atendimento e o funil de vendas">
                  Configurado pela equipe S4S
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {s.editable ? (
              <KbMarkdownField value={drafts[s.key] ?? ""} onChange={(v) => setDrafts((d) => ({ ...d, [s.key]: v }))} disabled={m.isPending} />
            ) : (
              <details className="text-sm">
                <summary className="cursor-pointer text-s4s-blue hover:underline">Ver conteúdo</summary>
                <div className="prose prose-sm mt-2 max-w-none rounded-md border bg-muted/30 p-3">
                  <ReactMarkdown>{s.content}</ReactMarkdown>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end">
        <Button onClick={() => m.mutate(drafts)} disabled={m.isPending} className="bg-s4s-blue hover:bg-s4s-blue/90">
          {m.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
