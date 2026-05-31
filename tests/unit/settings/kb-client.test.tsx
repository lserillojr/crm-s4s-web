import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KbClient } from "@/app/(dashboard)/settings/kb/kb-client";

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}
const SECTIONS = [
  { key: "identidade", title: "Identidade e tom", editable: true, content: "Loja X" },
  { key: "regras_odoo", title: "Regras Odoo (movimentação do pipeline)", editable: false, content: "Novo → Em Contato" },
];
beforeEach(() => { (global.fetch as any) = vi.fn(); });
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("KbClient", () => {
  it("mostra bloco editável como textbox e travado como read-only", async () => {
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify({ sections: SECTIONS, hasPrevious: false, updatedAt: null }), { status: 200 }));
    wrap(<KbClient />);
    await waitFor(() => expect(screen.getByText("Identidade e tom")).toBeInTheDocument());
    expect(screen.getAllByRole("textbox")).toHaveLength(1); // só o editável
    expect(screen.getByText(/Configurado pela equipe S4S/i)).toBeInTheDocument();
  });
  it("erro de carga mostra banner", async () => {
    (global.fetch as any).mockResolvedValue(new Response("err", { status: 502 }));
    wrap(<KbClient />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
