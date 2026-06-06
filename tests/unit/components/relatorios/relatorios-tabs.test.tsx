import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RelatoriosTabs } from "@/components/relatorios/relatorios-tabs";

vi.mock("@/components/relatorios/relatorios-client", () => ({
  RelatoriosClient: () => <div>RESUMO_MOCK</div>,
}));

describe("RelatoriosTabs", () => {
  it("tem as abas Resumo e Detalhado; Resumo é o padrão", () => {
    render(<RelatoriosTabs detalhadoSrc="https://chat.example.com/x?embed=s4s" />);
    expect(screen.getByRole("tab", { name: "Resumo" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Detalhado" })).toBeInTheDocument();
    expect(screen.getByText("RESUMO_MOCK")).toBeVisible();
  });

  it("aba Detalhado monta o iframe com o src", async () => {
    render(<RelatoriosTabs detalhadoSrc="https://chat.example.com/x?embed=s4s" />);
    await userEvent.click(screen.getByRole("tab", { name: "Detalhado" }));
    const frame = screen.getByTestId("embedded-frame");
    expect(frame).toHaveAttribute("src", "https://chat.example.com/x?embed=s4s");
  });

  it("src null cai no fallback neutro do EmbeddedFrame", async () => {
    render(<RelatoriosTabs detalhadoSrc={null} />);
    await userEvent.click(screen.getByRole("tab", { name: "Detalhado" }));
    expect(screen.getByTestId("embedded-frame-fallback")).toBeInTheDocument();
  });
});
