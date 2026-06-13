import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogoClient } from "@/app/(dashboard)/settings/catalogo/catalogo-client";
import type { CatalogProduct } from "@/lib/catalogo/types";

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const PRODUCT_ATIVO: CatalogProduct = {
  id: "prod-1",
  key: "corte-feminino",
  title: "Corte Feminino",
  description: "Corte e escova completo",
  priceBrl: 80,
  category: "Cabelo",
  attributes: {},
  source: "manual",
  isActive: true,
  sortOrder: 0,
};

const PRODUCT_RASCUNHO: CatalogProduct = {
  id: "prod-2",
  key: "manicure",
  title: "Manicure",
  description: null,
  priceBrl: null,
  category: null,
  attributes: {},
  source: "manual",
  isActive: false,
  sortOrder: 1,
};

beforeEach(() => {
  (global.fetch as unknown) = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CatalogoClient", () => {
  it("lista produtos ativos e rascunhos retornados pela API", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ products: [PRODUCT_ATIVO, PRODUCT_RASCUNHO] }),
        { status: 200 },
      ),
    );

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByText("Corte Feminino")).toBeInTheDocument(),
    );
    expect(screen.getByText("Manicure")).toBeInTheDocument();
  });

  // I6: produto com priceBrl null exibe "Sob consulta"
  it("produto com priceBrl null exibe 'Sob consulta'", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ products: [PRODUCT_RASCUNHO] }),
        { status: 200 },
      ),
    );

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByText("Manicure")).toBeInTheDocument(),
    );
    expect(screen.getByText("Sob consulta")).toBeInTheDocument();
  });

  it("distingue item ativo (lido pela IA) de rascunho visivelmente", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ products: [PRODUCT_ATIVO, PRODUCT_RASCUNHO] }),
        { status: 200 },
      ),
    );

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByText("Corte Feminino")).toBeInTheDocument(),
    );

    // Item ativo deve ter badge "Ativo" e rascunho deve ter badge "Rascunho"
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
  });

  it("exibe aviso de que itens ativos são lidos pela IA", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ products: [PRODUCT_ATIVO] }),
        { status: 200 },
      ),
    );

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByRole("note")).toBeInTheDocument(),
    );
    expect(screen.getByRole("note").textContent).toMatch(/IA/i);
  });

  it("editar preço dispara PUT /api/catalogo/[id]", async () => {
    const mockFetch = vi.fn();
    // Primeira chamada: GET lista
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ products: [PRODUCT_ATIVO] }),
        { status: 200 },
      ),
    );
    // Segunda chamada: PUT update
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ product: { ...PRODUCT_ATIVO, priceBrl: 90 } }),
        { status: 200 },
      ),
    );
    // Terceira chamada: GET refetch após mutação
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ products: [{ ...PRODUCT_ATIVO, priceBrl: 90 }] }),
        { status: 200 },
      ),
    );
    (global.fetch as unknown) = mockFetch;

    wrap(<CatalogoClient />);

    // Espera os produtos carregarem
    await waitFor(() =>
      expect(screen.getByText("Corte Feminino")).toBeInTheDocument(),
    );

    // Abre form de edição
    fireEvent.click(screen.getByTestId("editar-prod-1"));

    // Edita o preço
    const priceInput = screen.getByTestId("campo-preco");
    fireEvent.change(priceInput, { target: { value: "90" } });

    // Salva
    fireEvent.click(screen.getByTestId("salvar-edicao"));

    // PUT deve ter sido chamado
    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const putCall = calls.find(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("/api/catalogo/prod-1") &&
          c[1]?.method === "PUT",
      );
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall![1].body as string);
      expect(body.priceBrl).toBe(90);
    });
  });

  it("erro de carga mostra banner de erro", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("err", { status: 502 }),
    );

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
  });

  it("publicar rascunho chama PUT com isActive=true", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ products: [PRODUCT_RASCUNHO] }),
        { status: 200 },
      ),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ product: { ...PRODUCT_RASCUNHO, isActive: true } }),
        { status: 200 },
      ),
    );
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ products: [{ ...PRODUCT_RASCUNHO, isActive: true }] }),
        { status: 200 },
      ),
    );
    (global.fetch as unknown) = mockFetch;

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByText("Manicure")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("publicar-prod-2"));

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const putCall = calls.find(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("/api/catalogo/prod-2") &&
          c[1]?.method === "PUT",
      );
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall![1].body as string);
      expect(body.isActive).toBe(true);
    });
  });

  it("desativar item ativo chama DELETE /api/catalogo/[id] (soft-delete)", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ products: [PRODUCT_ATIVO] }),
        { status: 200 },
      ),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ok: true }),
        { status: 200 },
      ),
    );
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ products: [] }),
        { status: 200 },
      ),
    );
    (global.fetch as unknown) = mockFetch;

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByText("Corte Feminino")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("desativar-prod-1"));

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const deleteCall = calls.find(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("/api/catalogo/prod-1") &&
          c[1]?.method === "DELETE",
      );
      expect(deleteCall).toBeDefined();
    });
  });

  // ── GAP 1: adicionar produto manual ─────────────────────────────────────────

  it("botão 'Adicionar produto' abre formulário de criação", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ products: [] }), { status: 200 }),
    );

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByTestId("adicionar-produto")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("adicionar-produto"));

    expect(screen.getByTestId("add-campo-titulo")).toBeInTheDocument();
    expect(screen.getByTestId("add-campo-descricao")).toBeInTheDocument();
    expect(screen.getByTestId("add-campo-preco")).toBeInTheDocument();
    expect(screen.getByTestId("add-campo-categoria")).toBeInTheDocument();
    expect(screen.getByTestId("add-campo-attributes")).toBeInTheDocument();
  });

  it("preencher e submeter formulário de adição dispara POST /api/catalogo sem isActive:true", async () => {
    const mockFetch = vi.fn();
    // GET lista inicial (vazia)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [] }), { status: 200 }),
    );
    // POST create
    const newProduct: CatalogProduct = {
      id: "prod-new",
      key: "hidratacao-profunda",
      title: "Hidratação Profunda",
      description: "Tratamento intensivo",
      priceBrl: 120,
      category: "Cabelo",
      attributes: { sessoes: 1 },
      source: "manual",
      isActive: false,
      sortOrder: 0,
    };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ product: newProduct }), { status: 201 }),
    );
    // GET refetch após criação
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ products: [newProduct] }), { status: 200 }),
    );
    (global.fetch as unknown) = mockFetch;

    wrap(<CatalogoClient />);

    // Espera lista carregar e abre o form
    await waitFor(() =>
      expect(screen.getByTestId("adicionar-produto")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("adicionar-produto"));

    // Preenche os campos
    fireEvent.change(screen.getByTestId("add-campo-titulo"), {
      target: { value: "Hidratação Profunda" },
    });
    fireEvent.change(screen.getByTestId("add-campo-descricao"), {
      target: { value: "Tratamento intensivo" },
    });
    fireEvent.change(screen.getByTestId("add-campo-preco"), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByTestId("add-campo-categoria"), {
      target: { value: "Cabelo" },
    });
    fireEvent.change(screen.getByTestId("add-campo-attributes"), {
      target: { value: '{"sessoes": 1}' },
    });

    // Salva
    fireEvent.click(screen.getByTestId("add-salvar"));

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const postCall = calls.find(
        (c) =>
          typeof c[0] === "string" &&
          c[0] === "/api/catalogo" &&
          c[1]?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body as string);
      expect(body.title).toBe("Hidratação Profunda");
      expect(body.attributes).toEqual({ sessoes: 1 });
      // Produto criado como rascunho — isActive NÃO deve ser true
      expect(body.isActive).not.toBe(true);
    });
  });

  // I7: após POST com sucesso, formulário fecha e botão "Adicionar produto" volta
  it("após POST com sucesso, formulário fecha e botão 'Adicionar produto' reaparece", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [] }), { status: 200 }),
    );
    const newProduct: CatalogProduct = {
      id: "prod-new",
      key: "novo-produto",
      title: "Novo Produto",
      description: null,
      priceBrl: null,
      category: null,
      attributes: {},
      source: "manual",
      isActive: false,
      sortOrder: 0,
    };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ product: newProduct }), { status: 201 }),
    );
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ products: [newProduct] }), { status: 200 }),
    );
    (global.fetch as unknown) = mockFetch;

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByTestId("adicionar-produto")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("adicionar-produto"));
    expect(screen.getByTestId("form-adicionar")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("add-campo-titulo"), {
      target: { value: "Novo Produto" },
    });
    fireEvent.click(screen.getByTestId("add-salvar"));

    // Formulário deve fechar e botão deve voltar
    await waitFor(() =>
      expect(screen.queryByTestId("form-adicionar")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("adicionar-produto")).toBeInTheDocument();
  });

  // C2: POST retorna 409 → exibe mensagem específica de nome duplicado
  it("POST retornando 409 exibe mensagem de nome duplicado", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [] }), { status: 200 }),
    );
    // POST retorna 409
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "key_already_exists" }), { status: 409 }),
    );
    (global.fetch as unknown) = mockFetch;

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByTestId("adicionar-produto")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("adicionar-produto"));

    fireEvent.change(screen.getByTestId("add-campo-titulo"), {
      target: { value: "Corte Feminino" },
    });
    fireEvent.click(screen.getByTestId("add-salvar"));

    await waitFor(() =>
      expect(screen.getByTestId("add-error-banner")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("add-error-banner").textContent).toMatch(
      /Já existe um produto com esse nome/,
    );
  });

  // ── GAP 2: edição de attributes ─────────────────────────────────────────────

  it("editar attributes de produto existente dispara PUT com objeto attributes parseado", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          products: [{ ...PRODUCT_ATIVO, attributes: { duracao: "45min" } }],
        }),
        { status: 200 },
      ),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          product: {
            ...PRODUCT_ATIVO,
            attributes: { duracao: "60min", sessoes: 2 },
          },
        }),
        { status: 200 },
      ),
    );
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ products: [PRODUCT_ATIVO] }), {
        status: 200,
      }),
    );
    (global.fetch as unknown) = mockFetch;

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByText("Corte Feminino")).toBeInTheDocument(),
    );

    // Abre edição
    fireEvent.click(screen.getByTestId("editar-prod-1"));

    // Edita o campo de attributes
    const attrsField = screen.getByTestId("campo-attributes");
    fireEvent.change(attrsField, {
      target: { value: '{"duracao": "60min", "sessoes": 2}' },
    });

    // Salva
    fireEvent.click(screen.getByTestId("salvar-edicao"));

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const putCall = calls.find(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("/api/catalogo/prod-1") &&
          c[1]?.method === "PUT",
      );
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall![1].body as string);
      expect(body.attributes).toEqual({ duracao: "60min", sessoes: 2 });
    });
  });

  it("JSON inválido no campo attributes bloqueia o PUT e exibe erro inline", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ products: [PRODUCT_ATIVO] }),
        { status: 200 },
      ),
    );
    (global.fetch as unknown) = mockFetch;

    wrap(<CatalogoClient />);

    await waitFor(() =>
      expect(screen.getByText("Corte Feminino")).toBeInTheDocument(),
    );

    // Abre edição
    fireEvent.click(screen.getByTestId("editar-prod-1"));

    // Insere JSON inválido
    const attrsField = screen.getByTestId("campo-attributes");
    fireEvent.change(attrsField, { target: { value: "{invalid json" } });

    // Tenta salvar
    fireEvent.click(screen.getByTestId("salvar-edicao"));

    // Mensagem de erro deve aparecer
    await waitFor(() =>
      expect(screen.getByTestId("edit-attributes-error")).toBeInTheDocument(),
    );

    // Nenhum PUT deve ter sido disparado (só o GET inicial)
    const putCalls = mockFetch.mock.calls.filter(
      (c) =>
        typeof c[0] === "string" &&
        c[0].includes("/api/catalogo/prod-1") &&
        c[1]?.method === "PUT",
    );
    expect(putCalls).toHaveLength(0);
  });
});
