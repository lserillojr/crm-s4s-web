"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FunilStageRow } from "@/lib/funil/schema";

const ENDPOINT = "/api/funil-config";

type SaveResult = { ok: boolean; results?: Array<{ role: string; ok: boolean; error?: string }> };

export function FunilClient() {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<FunilStageRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch(ENDPOINT, { method: "GET" });
        const body = (await res.json()) as { stages?: FunilStageRow[] };
        if (!active) return;
        const stages = body.stages ?? [];
        setRows(stages);
        const initial: Record<string, string> = {};
        for (const s of stages) if (s.role) initial[s.role] = s.name;
        setDrafts(initial);
      } finally {
        if (active) setMounted(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSubmitting(true);
    setStatus("idle");
    setRowErrors({});
    try {
      const renames = rows
        .filter((r) => r.editable && r.role)
        .filter((r) => (drafts[r.role as string] ?? "").trim() !== r.name)
        .map((r) => ({ role: r.role as string, name: (drafts[r.role as string] ?? "").trim() }));

      if (renames.length === 0) {
        setStatus("saved");
        return;
      }

      const res = await fetch(ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renames }),
      });
      const data = (await res.json().catch(() => ({}))) as SaveResult;

      if (!res.ok || !data.ok) {
        const errs: Record<string, string> = {};
        for (const r of data.results ?? []) if (!r.ok && r.error) errs[r.role] = r.error;
        setRowErrors(errs);
        setStatus("error");
        return;
      }

      setRows((prev) =>
        prev.map((r) => {
          const applied = renames.find((x) => x.role === r.role);
          return applied ? { ...r, name: applied.name } : r;
        }),
      );
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      {status === "saved" && (
        <div role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          Pronto! Os nomes das etapas foram salvos.
        </div>
      )}
      {status === "error" && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          Não consegui salvar alguns nomes — confira as mensagens abaixo e tente de novo.
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Nomes das etapas do funil</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dê às etapas do seu funil os nomes que fazem sentido para o seu negócio. Isso muda só o
            rótulo que aparece — a ordem e o que cada etapa faz continuam iguais.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((r) => (
            <div key={`${r.role ?? "x"}-${r.sequence}`} className="grid grid-cols-2 gap-3 items-center">
              <div className="text-sm text-muted-foreground">{r.meaning || r.name}</div>
              {r.editable && r.role ? (
                <div>
                  <Input
                    aria-label={`Nome da etapa ${r.meaning || r.name}`}
                    value={drafts[r.role] ?? ""}
                    maxLength={64}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.role as string]: e.target.value }))}
                  />
                  {rowErrors[r.role] && <p className="mt-1 text-xs text-red-700">{rowErrors[r.role]}</p>}
                </div>
              ) : (
                <div className="text-sm">{r.name}</div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={submitting} className="bg-s4s-blue hover:bg-s4s-blue/90">
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
