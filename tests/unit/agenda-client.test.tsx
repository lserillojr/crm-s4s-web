import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AgendaClient } from "@/components/agenda/agenda-client";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockAppointment = {
  id: "a1",
  start: "2026-06-10T13:00:00Z",
  end: "2026-06-10T14:00:00Z",
  contactName: "Ana Cliente",
  status: "confirmado",
  source: "ia",
};

const mockBlock = {
  id: "b1",
  start: "2026-06-10T18:00:00Z",
  end: "2026-06-10T19:00:00Z",
  reason: "Almoço",
};

const mockData = {
  appointments: [mockAppointment],
  blocks: [mockBlock],
};

// ---------------------------------------------------------------------------
// Mock states for hooks
// ---------------------------------------------------------------------------

const mutationIdle = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  reset: vi.fn(),
};

let mockUseAgendaReturn: { data: typeof mockData | undefined; isLoading: boolean; isError: boolean };
let mockCreateBlock: typeof mutationIdle;
let mockDeleteBlock: typeof mutationIdle;
let mockCancelAppt: typeof mutationIdle;
let mockRescheduleAppt: typeof mutationIdle;
let mockCreateAppt: typeof mutationIdle & { error: Error | null };

vi.mock("@/lib/agenda/use-agenda", () => ({
  useAgenda: () => mockUseAgendaReturn,
  useCreateBlock: () => mockCreateBlock,
  useDeleteBlock: () => mockDeleteBlock,
  useCancelAppointment: () => mockCancelAppt,
  useRescheduleAppointment: () => mockRescheduleAppt,
  useCreateAppointment: () => mockCreateAppt,
}));

beforeEach(() => {
  mockUseAgendaReturn = { data: mockData, isLoading: false, isError: false };
  mockCreateBlock = { mutate: vi.fn(), isPending: false, isError: false, reset: vi.fn() };
  mockDeleteBlock = { mutate: vi.fn(), isPending: false, isError: false, reset: vi.fn() };
  mockCancelAppt = { mutate: vi.fn(), isPending: false, isError: false, reset: vi.fn() };
  mockRescheduleAppt = { mutate: vi.fn(), isPending: false, isError: false, reset: vi.fn() };
  mockCreateAppt = { mutate: vi.fn(), isPending: false, isError: false, reset: vi.fn(), error: null };
});

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("AgendaClient", () => {
  it("renderiza o agendamento e o bloqueio vindos do hook", () => {
    render(<AgendaClient />);
    expect(screen.getByText("Ana Cliente")).toBeInTheDocument();
    expect(screen.getByText("Almoço")).toBeInTheDocument();
    expect(screen.getByText("bloqueio")).toBeInTheDocument();
  });

  it("mostra o botão 'Bloquear horário'", () => {
    render(<AgendaClient />);
    expect(
      screen.getByRole("button", { name: /bloquear horário/i }),
    ).toBeInTheDocument();
  });

  it("abre o formulário de bloqueio ao clicar em '+ Bloquear horário'", () => {
    render(<AgendaClient />);
    fireEvent.click(screen.getByRole("button", { name: /bloquear horário/i }));
    expect(screen.getByRole("form", { name: /formulário de bloqueio/i })).toBeInTheDocument();
  });

  it("mostra botões 'Cancelar' e 'Reagendar' para o agendamento confirmado", () => {
    render(<AgendaClient />);
    expect(
      screen.getByRole("button", { name: /cancelar compromisso com ana cliente/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reagendar compromisso com ana cliente/i }),
    ).toBeInTheDocument();
  });

  it("mostra botão 'Remover' para o bloqueio", () => {
    render(<AgendaClient />);
    expect(
      screen.getByRole("button", { name: /remover bloqueio almoço/i }),
    ).toBeInTheDocument();
  });

  it("clicar em 'Remover' chama deleteBlock.mutate com o id do bloqueio", () => {
    render(<AgendaClient />);
    fireEvent.click(screen.getByRole("button", { name: /remover bloqueio almoço/i }));
    expect(mockDeleteBlock.mutate).toHaveBeenCalledWith("b1");
  });

  it("clicar em 'Cancelar' chama cancelAppt.mutate com o id do agendamento", () => {
    render(<AgendaClient />);
    fireEvent.click(
      screen.getByRole("button", { name: /cancelar compromisso com ana cliente/i }),
    );
    expect(mockCancelAppt.mutate).toHaveBeenCalledWith("a1");
  });

  it("clicar em 'Reagendar' abre o formulário inline de reagendamento", () => {
    render(<AgendaClient />);
    fireEvent.click(
      screen.getByRole("button", { name: /reagendar compromisso com ana cliente/i }),
    );
    // Formulário de reagendamento aparece
    expect(screen.getByRole("form", { name: /reagendar compromisso a1/i })).toBeInTheDocument();
  });

  it("botões ficam desabilitados quando deleteBlock.isPending=true", () => {
    mockDeleteBlock = { ...mockDeleteBlock, isPending: true };
    render(<AgendaClient />);
    const btn = screen.getByRole("button", { name: /remover bloqueio almoço/i });
    expect(btn).toBeDisabled();
  });

  it("botões de cancelar ficam desabilitados quando cancelAppt.isPending=true", () => {
    mockCancelAppt = { ...mockCancelAppt, isPending: true };
    render(<AgendaClient />);
    const btn = screen.getByRole("button", { name: /cancelar compromisso com ana cliente/i });
    expect(btn).toBeDisabled();
  });

  it("estado isLoading mostra 'Carregando sua agenda…'", () => {
    mockUseAgendaReturn = { data: undefined, isLoading: true, isError: false };
    render(<AgendaClient />);
    expect(screen.getByText(/carregando sua agenda/i)).toBeInTheDocument();
  });

  it("estado isError mostra mensagem amigável de erro", () => {
    mockUseAgendaReturn = { data: undefined, isLoading: false, isError: true };
    render(<AgendaClient />);
    expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível carregar sua agenda/i);
  });

  it("lista vazia mostra mensagem de nenhum compromisso", () => {
    mockUseAgendaReturn = {
      data: { appointments: [], blocks: [] },
      isLoading: false,
      isError: false,
    };
    render(<AgendaClient />);
    expect(screen.getByText(/você não tem compromissos/i)).toBeInTheDocument();
  });

  it("erro de deleteBlock mostra mensagem de erro inline", () => {
    mockDeleteBlock = { ...mockDeleteBlock, isError: true };
    render(<AgendaClient />);
    expect(screen.getByText(/não consegui remover o bloqueio/i)).toBeInTheDocument();
  });

  it("erro de cancelAppt mostra mensagem de erro inline", () => {
    mockCancelAppt = { ...mockCancelAppt, isError: true };
    render(<AgendaClient />);
    expect(screen.getByText(/não consegui cancelar o compromisso/i)).toBeInTheDocument();
  });

  it("agendamento com status 'cancelado' não exibe botões de ação", () => {
    mockUseAgendaReturn = {
      data: {
        appointments: [{ ...mockAppointment, status: "cancelado" }],
        blocks: [],
      },
      isLoading: false,
      isError: false,
    };
    render(<AgendaClient />);
    expect(
      screen.queryByRole("button", { name: /cancelar compromisso/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /reagendar compromisso/i }),
    ).not.toBeInTheDocument();
  });
});
