import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { RelatoriosClient } from "@/components/relatorios/relatorios-client";
import { useRelatoriosSummary } from "@/lib/relatorios/use-relatorios-summary";
import type { RelatoriosSummary } from "@/lib/relatorios/contract";

vi.mock("@/lib/relatorios/use-relatorios-summary", () => ({
  useRelatoriosSummary: vi.fn(),
}));

const base: RelatoriosSummary = {
  period: { days: 30, from: "2026-05-06", to: "2026-06-05" },
  ia: { conversasAtendidas: 83, tempoRespostaSegundos: 12, foraHorario: 31 },
  agenda: { agendados: 14, faltas: null, remarcacoes: null },
  funil: { etapaTrava: "Orçamento", motivoPerdaTop: "Preço" },
  pico: { diaSemana: "terça", faixaHorario: "19h–21h" },
  csat: null,
};

function mockData(over: Partial<RelatoriosSummary>) {
  (useRelatoriosSummary as unknown as Mock).mockReturnValue({
    data: { ...base, ...over },
    isLoading: false,
    isError: false,
  });
}

describe("RelatoriosClient — cards fase 2", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra o card de fora-do-horário quando > 0", () => {
    mockData({});
    render(<RelatoriosClient />);
    expect(
      screen.getByText("31 clientes atendidos fora do expediente"),
    ).toBeInTheDocument();
  });

  it("omite o card de fora-do-horário quando 0", () => {
    mockData({ ia: { ...base.ia, foraHorario: 0 } });
    render(<RelatoriosClient />);
    expect(screen.queryByText(/fora do expediente/)).not.toBeInTheDocument();
  });

  it("omite o card de fora-do-horário quando null", () => {
    mockData({ ia: { ...base.ia, foraHorario: null } });
    render(<RelatoriosClient />);
    expect(screen.queryByText(/fora do expediente/)).not.toBeInTheDocument();
  });

  it("mostra o pico quando há dado", () => {
    mockData({});
    render(<RelatoriosClient />);
    expect(screen.getByText("Seu pico é terça, 19h–21h")).toBeInTheDocument();
  });

  it("mostra estado vazio do pico quando null", () => {
    mockData({ pico: null });
    render(<RelatoriosClient />);
    expect(
      screen.getByText("Ainda sem movimento suficiente pra apontar um padrão"),
    ).toBeInTheDocument();
  });

  it("mostra o card de Venda Fechada + R$ quando há vendas", () => {
    mockData({ funil: { etapaTrava: "Orçamento", motivoPerdaTop: "Preço", vendaFechadaCount: 3, faturamentoBrl: 4480 } });
    render(<RelatoriosClient />);
    expect(screen.getByText("3 vendas fechadas — R$ 4.480 faturados")).toBeInTheDocument();
  });

  it("omite o card de Venda Fechada quando 0", () => {
    mockData({ funil: { etapaTrava: "Orçamento", motivoPerdaTop: "Preço", vendaFechadaCount: 0, faturamentoBrl: 0 } });
    render(<RelatoriosClient />);
    expect(screen.queryByText(/vendas? fechadas?/)).not.toBeInTheDocument();
  });

  it("omite o card de Venda Fechada quando null (WF antigo / tenant sem o role)", () => {
    mockData({ funil: { etapaTrava: "Orçamento", motivoPerdaTop: "Preço" } });
    render(<RelatoriosClient />);
    expect(screen.queryByText(/vendas? fechadas?/)).not.toBeInTheDocument();
  });
});
