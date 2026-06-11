import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AcompanhamentoClient } from "@/app/(dashboard)/settings/acompanhamento/acompanhamento-client";

beforeEach(() => {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ config: { enabled: false, intensity: "padrao", followup_enabled: true, noshow_enabled: true, nutricao_enabled: false, respeitar_horario: true, mensagens: null }, loaded: true }), { status: 200 }),
  ) as any;
});

describe("AcompanhamentoClient", () => {
  it("mostra os cartões de intensidade só depois de ligar", async () => {
    render(<AcompanhamentoClient />);
    await waitFor(() => screen.getByTestId("toggle-enabled"));
    expect(screen.queryByTestId("intensity-cards")).toBeNull();
    fireEvent.click(screen.getByTestId("toggle-enabled"));
    expect(screen.getByTestId("intensity-cards")).toBeTruthy();
  });

  it("mostra o aviso ao marcar 'qualquer hora'", async () => {
    render(<AcompanhamentoClient />);
    await waitFor(() => screen.getByTestId("toggle-enabled"));
    fireEvent.click(screen.getByTestId("toggle-enabled"));
    fireEvent.click(screen.getByTestId("toggle-qualquer-hora"));
    expect(screen.getByTestId("aviso-invasivo")).toBeTruthy();
  });
});
