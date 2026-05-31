import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { WorkingHoursClient } from "@/app/(dashboard)/settings/working-hours/working-hours-client";
import { weeklyHoursDefaults } from "@/lib/working-hours/schema";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Mock de fetch que roteia por método: GET → load, PUT → save. */
function mockFetch(opts: {
  getBody?: unknown;
  getStatus?: number;
  putStatus?: number;
}) {
  const fn = vi.fn(async (_url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "PUT") {
      return new Response(
        JSON.stringify({ ok: opts.putStatus === undefined }),
        {
          status: opts.putStatus ?? 200,
        },
      );
    }
    return new Response(
      JSON.stringify(
        opts.getBody ?? { weeklyHours: weeklyHoursDefaults, loaded: true },
      ),
      { status: opts.getStatus ?? 200 },
    );
  });
  (global.fetch as any) = fn;
  return fn;
}

describe("WorkingHoursClient", () => {
  beforeEach(() => {
    mockFetch({});
  });

  it("ao montar, busca GET /api/working-hours e renderiza o form", async () => {
    const fetchFn = mockFetch({
      getBody: {
        weeklyHours: {
          ...weeklyHoursDefaults,
          monday: { closed: false, open: "08:30", close: "17:30" },
        },
        loaded: true,
      },
    });
    render(<WorkingHoursClient />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /salvar/i })).toBeTruthy(),
    );
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/working-hours",
      expect.objectContaining({ method: "GET" }),
    );
    const openInput = screen.getByLabelText(
      /hora de abertura seg/i,
    ) as HTMLInputElement;
    expect(openInput.value).toBe("08:30");
  });

  it("quando o backend não carregou (loaded:false), mostra aviso de não sincronizado", async () => {
    mockFetch({
      getBody: { weeklyHours: weeklyHoursDefaults, loaded: false },
    });
    render(<WorkingHoursClient />);

    await waitFor(() =>
      expect(screen.getByText(/não consegui carregar/i)).toBeTruthy(),
    );
  });

  it("salvar com sucesso: faz PUT com o horário e mostra confirmação", async () => {
    const fetchFn = mockFetch({});
    render(<WorkingHoursClient />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /salvar/i })).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(screen.getByText(/horário salvo/i)).toBeTruthy(),
    );
    const putCall = fetchFn.mock.calls.find((c) => c[1]?.method === "PUT");
    expect(putCall).toBeTruthy();
    const sent = JSON.parse(putCall![1]!.body as string);
    expect(sent.monday.open).toBe("09:00");
  });

  it("salvar com falha (502): mostra erro e NÃO confirmação", async () => {
    mockFetch({ putStatus: 502 });
    render(<WorkingHoursClient />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /salvar/i })).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(screen.getByText(/não consegui salvar/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/horário salvo/i)).toBeNull();
  });
});
