import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FunilClient } from "@/app/(dashboard)/settings/funil/funil-client";

beforeEach(() => {
  (global.fetch as unknown) = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const GET_BODY = {
  loaded: true,
  stages: [
    { role: "novo", meaning: "Cliente novo — acabou de chegar", name: "Novo", sequence: 10, isWon: false, editable: true },
    { role: "orcamento", meaning: "Orçamento ou proposta enviada", name: "Em Orçamento", sequence: 30, isWon: false, editable: true },
  ],
};

describe("FunilClient", () => {
  it("carrega e mostra significado + label atual", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(GET_BODY), { status: 200 }),
    );
    await act(async () => {
      render(<FunilClient />);
    });
    await waitFor(() => expect(screen.getByDisplayValue("Em Orçamento")).toBeTruthy());
    expect(screen.getByText("Orçamento ou proposta enviada")).toBeTruthy();
  });

  it("salva só os labels alterados", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(GET_BODY), { status: 200 }));
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, results: [{ role: "orcamento", ok: true }] }), { status: 200 }),
    );
    await act(async () => {
      render(<FunilClient />);
    });
    const input = await screen.findByDisplayValue("Em Orçamento");
    await userEvent.clear(input);
    await userEvent.type(input, "Proposta");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, init] = fetchMock.mock.calls[1]!;
    expect((init as { method: string }).method).toBe("PUT");
    const sent = JSON.parse((init as { body: string }).body);
    expect(sent.renames).toEqual([{ role: "orcamento", name: "Proposta" }]);
  });
});
