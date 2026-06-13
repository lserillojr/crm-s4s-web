"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogProduct } from "@/lib/catalogo/types";

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchCatalogo(): Promise<{ products: CatalogProduct[] }> {
  const r = await fetch("/api/catalogo", { cache: "no-store" });
  if (!r.ok) throw new Error(`catalogo ${r.status}`);
  return r.json();
}

async function updateProduct(
  id: string,
  data: Partial<Omit<CatalogProduct, "id" | "key" | "source" | "sortOrder">>,
): Promise<{ product: CatalogProduct }> {
  const r = await fetch(`/api/catalogo/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`update ${r.status}`);
  return r.json();
}

async function deactivateProduct(id: string): Promise<void> {
  const r = await fetch(`/api/catalogo/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`deactivate ${r.status}`);
}

// ─── Inline edit form ────────────────────────────────────────────────────────

type EditState = {
  title: string;
  description: string;
  priceBrl: string; // string para o input; converte na hora de salvar
  category: string;
};

function toEditState(p: CatalogProduct): EditState {
  return {
    title: p.title,
    description: p.description ?? "",
    priceBrl: p.priceBrl != null ? String(p.priceBrl) : "",
    category: p.category ?? "",
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CatalogoClient() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["catalogo"], queryFn: fetchCatalogo });

  // editingId: id do produto sendo editado inline (null = nenhum)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateProduct>[1];
    }) => updateProduct(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["catalogo"] });
      setEditingId(null);
      setEditState(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["catalogo"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => updateProduct(id, { isActive: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["catalogo"] });
    },
  });

  // ── Render states ────────────────────────────────────────────────────────

  if (q.isLoading)
    return (
      <p className="text-sm text-muted-foreground">Carregando catálogo...</p>
    );

  if (q.isError)
    return (
      <div
        role="alert"
        className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
      >
        Não consegui carregar o catálogo. Tente recarregar a página.
      </div>
    );

  const products = q.data!.products;

  function startEdit(p: CatalogProduct) {
    setEditingId(p.id);
    setEditState(toEditState(p));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  function saveEdit(id: string) {
    if (!editState) return;
    const priceBrl =
      editState.priceBrl.trim() === "" ? null : Number(editState.priceBrl);
    updateMutation.mutate({
      id,
      data: {
        title: editState.title,
        description: editState.description || null,
        priceBrl: Number.isNaN(priceBrl) ? null : priceBrl,
        category: editState.category || null,
      },
    });
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Aviso sobre itens ativos e a IA */}
      <div
        role="note"
        className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"
      >
        Itens marcados como <strong>Ativos</strong> são lidos pela IA para
        oferecer aos seus clientes. Rascunhos ficam salvos mas não aparecem no
        atendimento.
      </div>

      {(updateMutation.isError || deactivateMutation.isError || publishMutation.isError) && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          Não consegui salvar. Tente de novo em instantes.
        </div>
      )}

      {products.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum produto cadastrado ainda.
        </p>
      )}

      {products.map((p) => {
        const isEditing = editingId === p.id;

        return (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{p.title}</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    p.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {p.isActive ? "Ativo" : "Rascunho"}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {isEditing && editState ? (
                /* ── Inline edit form ─────────────────────────────────── */
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor={`titulo-${p.id}`}>Nome do produto</Label>
                    <Input
                      id={`titulo-${p.id}`}
                      data-testid="campo-titulo"
                      value={editState.title}
                      onChange={(e) =>
                        setEditState((s) => s && { ...s, title: e.target.value })
                      }
                      disabled={updateMutation.isPending}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`descricao-${p.id}`}>Descrição</Label>
                    <Input
                      id={`descricao-${p.id}`}
                      data-testid="campo-descricao"
                      value={editState.description}
                      onChange={(e) =>
                        setEditState(
                          (s) => s && { ...s, description: e.target.value },
                        )
                      }
                      disabled={updateMutation.isPending}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`preco-${p.id}`}>
                      Preço (R$) — deixe vazio para &ldquo;sob consulta&rdquo;
                    </Label>
                    <Input
                      id={`preco-${p.id}`}
                      data-testid="campo-preco"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editState.priceBrl}
                      onChange={(e) =>
                        setEditState(
                          (s) => s && { ...s, priceBrl: e.target.value },
                        )
                      }
                      disabled={updateMutation.isPending}
                      placeholder="Sob consulta"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`categoria-${p.id}`}>Categoria</Label>
                    <Input
                      id={`categoria-${p.id}`}
                      data-testid="campo-categoria"
                      value={editState.category}
                      onChange={(e) =>
                        setEditState(
                          (s) => s && { ...s, category: e.target.value },
                        )
                      }
                      disabled={updateMutation.isPending}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      data-testid="salvar-edicao"
                      size="sm"
                      onClick={() => saveEdit(p.id)}
                      disabled={updateMutation.isPending}
                      className="bg-s4s-blue hover:bg-s4s-blue/90"
                    >
                      {updateMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      data-testid="cancelar-edicao"
                      size="sm"
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={updateMutation.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Read-only view ───────────────────────────────────── */
                <div className="space-y-1 text-sm">
                  {p.description && (
                    <p className="text-muted-foreground">{p.description}</p>
                  )}
                  <p>
                    {p.priceBrl != null
                      ? `R$ ${p.priceBrl.toFixed(2)}`
                      : "Sob consulta"}
                  </p>
                  {p.category && (
                    <p className="text-xs text-muted-foreground">
                      {p.category}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    {/* Editar */}
                    <Button
                      data-testid={`editar-${p.id}`}
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(p)}
                    >
                      Editar
                    </Button>

                    {/* Publicar rascunho */}
                    {!p.isActive && (
                      <Button
                        data-testid={`publicar-${p.id}`}
                        size="sm"
                        onClick={() => publishMutation.mutate(p.id)}
                        disabled={publishMutation.isPending}
                        className="bg-s4s-blue hover:bg-s4s-blue/90"
                      >
                        Publicar
                      </Button>
                    )}

                    {/* Desativar item ativo */}
                    {p.isActive && (
                      <Button
                        data-testid={`desativar-${p.id}`}
                        size="sm"
                        variant="outline"
                        onClick={() => deactivateMutation.mutate(p.id)}
                        disabled={deactivateMutation.isPending}
                      >
                        Desativar
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
