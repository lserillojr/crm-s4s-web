"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogProduct } from "@/lib/catalogo/types";
import { slugify } from "@/lib/utils/slugify";

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchCatalogo(): Promise<{ products: CatalogProduct[] }> {
  const r = await fetch("/api/catalogo", { cache: "no-store" });
  if (!r.ok) throw new Error(`catalogo ${r.status}`);
  return r.json();
}

async function createProduct(data: {
  key: string;
  title: string;
  description: string | null;
  priceBrl: number | null;
  category: string | null;
  attributes: Record<string, unknown>;
}): Promise<{ product: CatalogProduct }> {
  const r = await fetch("/api/catalogo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...data, isActive: false }),
  });
  if (r.status === 409) throw new Error("key_exists");
  if (!r.ok) throw new Error(`create ${r.status}`);
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

// ─── Inline edit state ───────────────────────────────────────────────────────

type EditState = {
  title: string;
  description: string;
  priceBrl: string; // string para o input; converte na hora de salvar
  category: string;
  attributesJson: string; // pretty JSON string
  attributesError: string | null;
};

function toEditState(p: CatalogProduct): EditState {
  return {
    title: p.title,
    description: p.description ?? "",
    priceBrl: p.priceBrl != null ? String(p.priceBrl) : "",
    category: p.category ?? "",
    attributesJson:
      Object.keys(p.attributes).length > 0
        ? JSON.stringify(p.attributes, null, 2)
        : "",
    attributesError: null,
  };
}

// ─── Add-product form state ───────────────────────────────────────────────────

type AddState = {
  title: string;
  description: string;
  priceBrl: string;
  category: string;
  attributesJson: string;
  attributesError: string | null;
};

const EMPTY_ADD_STATE: AddState = {
  title: "",
  description: "",
  priceBrl: "",
  category: "",
  attributesJson: "",
  attributesError: null,
};

// ─── Helpers to parse form → API payload ─────────────────────────────────────

function parseAttributesJson(
  raw: string,
): { ok: true; value: Record<string, unknown> } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return { ok: true, value: parsed as Record<string, unknown> };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

function parsePriceBrl(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CatalogoClient() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["catalogo"], queryFn: fetchCatalogo });

  // editingId: id do produto sendo editado inline (null = nenhum)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  // addOpen: controla se o formulário de adição manual está aberto
  const [addOpen, setAddOpen] = useState(false);
  const [addState, setAddState] = useState<AddState>(EMPTY_ADD_STATE);

  // per-row pending tracking (FIX I4)
  const [pendingPublishId, setPendingPublishId] = useState<string | null>(null);
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createProduct>[0]) =>
      createProduct(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["catalogo"] });
      setAddOpen(false);
      setAddState(EMPTY_ADD_STATE);
    },
  });

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
    onSettled: () => {
      setPendingDeactivateId(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => updateProduct(id, { isActive: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["catalogo"] });
    },
    onSettled: () => {
      setPendingPublishId(null);
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
    updateMutation.reset(); // FIX C1: clear stale error from previous product
    setEditingId(p.id);
    setEditState(toEditState(p));
  }

  function cancelEdit() {
    updateMutation.reset(); // FIX C1: clear stale error on cancel
    setEditingId(null);
    setEditState(null);
  }

  function saveEdit(id: string) {
    if (!editState) return;

    // Validate attributes JSON before submitting
    const attrResult = parseAttributesJson(editState.attributesJson);
    if (!attrResult.ok) {
      setEditState((s) =>
        s ? { ...s, attributesError: "JSON inválido. Corrija antes de salvar." } : s,
      );
      return;
    }

    const priceBrl = parsePriceBrl(editState.priceBrl);
    updateMutation.mutate({
      id,
      data: {
        title: editState.title,
        description: editState.description || null,
        priceBrl,
        category: editState.category || null,
        attributes: attrResult.value,
      },
    });
  }

  function submitAdd() {
    if (!addState.title.trim()) return;

    const attrResult = parseAttributesJson(addState.attributesJson);
    if (!attrResult.ok) {
      setAddState((s) => ({
        ...s,
        attributesError: "JSON inválido. Corrija antes de salvar.",
      }));
      return;
    }

    const priceBrl = parsePriceBrl(addState.priceBrl);
    createMutation.mutate({
      key: slugify(addState.title),
      title: addState.title.trim(),
      description: addState.description.trim() || null,
      priceBrl,
      category: addState.category.trim() || null,
      attributes: attrResult.value,
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

      {/* Botão para abrir formulário de adição manual */}
      {!addOpen && (
        <Button
          data-testid="adicionar-produto"
          onClick={() => setAddOpen(true)}
          className="bg-s4s-blue hover:bg-s4s-blue/90"
        >
          Adicionar produto
        </Button>
      )}

      {/* Formulário de adição manual */}
      {addOpen && (
        <Card data-testid="form-adicionar">
          <CardHeader>
            <CardTitle className="text-base">Novo produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="add-titulo">
                Nome do produto <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="add-titulo"
                data-testid="add-campo-titulo"
                value={addState.title}
                onChange={(e) =>
                  setAddState((s) => ({ ...s, title: e.target.value }))
                }
                disabled={createMutation.isPending}
                placeholder="Ex.: Corte Feminino"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-descricao">Descrição</Label>
              <Textarea
                id="add-descricao"
                data-testid="add-campo-descricao"
                value={addState.description}
                onChange={(e) =>
                  setAddState((s) => ({ ...s, description: e.target.value }))
                }
                disabled={createMutation.isPending}
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-preco">
                Preço (R$) — deixe vazio para &ldquo;sob consulta&rdquo;
              </Label>
              <Input
                id="add-preco"
                data-testid="add-campo-preco"
                type="number"
                min="0"
                step="0.01"
                value={addState.priceBrl}
                onChange={(e) =>
                  setAddState((s) => ({ ...s, priceBrl: e.target.value }))
                }
                disabled={createMutation.isPending}
                placeholder="Sob consulta"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-categoria">Categoria</Label>
              <Input
                id="add-categoria"
                data-testid="add-campo-categoria"
                value={addState.category}
                onChange={(e) =>
                  setAddState((s) => ({ ...s, category: e.target.value }))
                }
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-attributes">
                Atributos (JSON) — deixe vazio se não houver
              </Label>
              <Textarea
                id="add-attributes"
                data-testid="add-campo-attributes"
                value={addState.attributesJson}
                onChange={(e) =>
                  setAddState((s) => ({
                    ...s,
                    attributesJson: e.target.value,
                    attributesError: null,
                  }))
                }
                disabled={createMutation.isPending}
                placeholder='{"duracao": "60min", "sessoes": 1}'
                rows={4}
                className="font-mono text-xs"
              />
              {addState.attributesError && (
                <p
                  role="alert"
                  data-testid="add-attributes-error"
                  className="text-xs text-red-600"
                >
                  {addState.attributesError}
                </p>
              )}
            </div>

            {createMutation.isError && (
              <div
                role="alert"
                data-testid="add-error-banner"
                className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
              >
                {createMutation.error instanceof Error &&
                createMutation.error.message === "key_exists"
                  ? "Já existe um produto com esse nome. Altere o nome e tente de novo."
                  : "Não consegui salvar. Tente de novo em instantes."}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                data-testid="add-salvar"
                size="sm"
                onClick={submitAdd}
                disabled={createMutation.isPending || !addState.title.trim()}
                className="bg-s4s-blue hover:bg-s4s-blue/90"
              >
                {createMutation.isPending ? "Salvando..." : "Salvar como rascunho"}
              </Button>
              <Button
                data-testid="add-cancelar"
                size="sm"
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                  setAddState(EMPTY_ADD_STATE);
                  createMutation.reset();
                }}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(updateMutation.isError || deactivateMutation.isError || publishMutation.isError) && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          Não consegui salvar. Tente de novo em instantes.
        </div>
      )}

      {products.length === 0 && !addOpen && (
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
                    <Textarea
                      id={`descricao-${p.id}`}
                      data-testid="campo-descricao"
                      value={editState.description}
                      onChange={(e) =>
                        setEditState(
                          (s) => s && { ...s, description: e.target.value },
                        )
                      }
                      disabled={updateMutation.isPending}
                      rows={3}
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

                  <div className="space-y-1">
                    <Label htmlFor={`attributes-${p.id}`}>
                      Atributos (JSON) — deixe vazio se não houver
                    </Label>
                    <Textarea
                      id={`attributes-${p.id}`}
                      data-testid="campo-attributes"
                      value={editState.attributesJson}
                      onChange={(e) =>
                        setEditState(
                          (s) =>
                            s && {
                              ...s,
                              attributesJson: e.target.value,
                              attributesError: null,
                            },
                        )
                      }
                      disabled={updateMutation.isPending}
                      placeholder='{"duracao": "60min"}'
                      rows={4}
                      className="font-mono text-xs"
                    />
                    {editState.attributesError && (
                      <p
                        role="alert"
                        data-testid="edit-attributes-error"
                        className="text-xs text-red-600"
                      >
                        {editState.attributesError}
                      </p>
                    )}
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
                        onClick={() => {
                          setPendingPublishId(p.id);
                          publishMutation.mutate(p.id);
                        }}
                        disabled={pendingPublishId === p.id}
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
                        onClick={() => {
                          setPendingDeactivateId(p.id);
                          deactivateMutation.mutate(p.id);
                        }}
                        disabled={pendingDeactivateId === p.id}
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
