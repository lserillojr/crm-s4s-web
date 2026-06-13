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

  it("desativar item ativo chama PUT com isActive=false", async () => {
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
});
