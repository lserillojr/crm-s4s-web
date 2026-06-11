import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { AgendaClient } from "@/components/agenda/agenda-client";
import type { GridItem } from "@/components/agenda/calendar-grid";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockAppointment: {
  id: string; start: string; end: string; contactName: string;
  status: string; source: string; meetLink?: string | null;
} = {
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

// ---------------------------------------------------------------------------
// Mock CalendarGrid — expõe botões de teste para disparar onCreateAt/onSelect
// ---------------------------------------------------------------------------

// The real GridItem shape (kind, id, start, end, label, source, status) is
// preserved — we just need controllable triggers for the interaction tests.
let capturedOnCreateAt: ((when: Date) => void) | null = null;
let capturedOnSelect: ((item: GridItem) => void) | null = null;
let capturedItems: GridItem[] = [];

vi.mock("@/components/agenda/calendar-grid", () => ({
  CalendarGrid: (props: {
    items: GridItem[];
    onCreateAt: (when: Date) => void;
    onSelect: (item: GridItem) => void;
  }) => {
    capturedOnCreateAt = props.onCreateAt;
    capturedOnSelect = props.onSelect;
    capturedItems = props.items;
    return (
      <div data-testid="calendar-grid">
        {props.items.map((it) => (
          <button key={it.id} type="button" onClick={() => props.onSelect(it)}>
            {it.label}
          </button>
        ))}
        <button
          type="button"
          aria-label="Criar em slot"
          onClick={() => props.onCreateAt(new Date("2026-06-10T09:00:00"))}
        >
          Criar em slot
        </button>
      </div>
    );
  },
}));

beforeEach(() => {
  capturedOnCreateAt = null;
  capturedOnSelect = null;
  capturedItems = [];
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

describe("AgendaClient (grade)", () => {
  it("renderiza a grade com o agendamento e o bloqueio vindos do hook", () => {
    render(<AgendaClient />);
    // CalendarGrid mock renders labels as buttons
    expect(screen.getByText("Ana Cliente")).toBeInTheDocument();
    expect(screen.getByText("Almoço")).toBeInTheDocument();
  });

  it("passa os itens corretos para CalendarGrid (appt + block)", () => {
    render(<AgendaClient />);
    expect(capturedItems).toHaveLength(2);
    const appt = capturedItems.find((i) => i.kind === "appt");
    const block = capturedItems.find((i) => i.kind === "block");
    expect(appt).toBeDefined();
    expect(appt?.label).toBe("Ana Cliente");
    expect(appt?.source).toBe("ia");
    expect(block).toBeDefined();
    expect(block?.label).toBe("Almoço");
  });

  it("clicar numa célula vazia abre o AppointmentForm", () => {
    render(<AgendaClient />);
    fireEvent.click(screen.getByRole("button", { name: /criar em slot/i }));
    expect(screen.getByRole("form", { name: /novo agendamento/i })).toBeInTheDocument();
  });

  it("clicar num card de agendamento abre o AppointmentPanel com 'Reagendar' e 'Cancelar'", () => {
    render(<AgendaClient />);
    fireEvent.click(screen.getByText("Ana Cliente"));
    expect(screen.getByRole("button", { name: /reagendar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
  });

  it("clicar num card de bloqueio abre o AppointmentPanel com 'Remover bloqueio'", () => {
    render(<AgendaClient />);
    fireEvent.click(screen.getByText("Almoço"));
    expect(screen.getByRole("button", { name: /remover bloqueio/i })).toBeInTheDocument();
  });

  it("'Fechar' no AppointmentPanel fecha o painel", () => {
    render(<AgendaClient />);
    fireEvent.click(screen.getByText("Ana Cliente"));
    expect(screen.getByRole("button", { name: /fechar/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /fechar/i }));
    expect(screen.queryByRole("button", { name: /reagendar/i })).not.toBeInTheDocument();
  });

  it("clicar em 'Cancelar' no painel chama cancelAppt.mutate com o id", () => {
    render(<AgendaClient />);
    fireEvent.click(screen.getByText("Ana Cliente"));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(mockCancelAppt.mutate).toHaveBeenCalledWith("a1", expect.any(Object));
  });

  it("clicar em 'Remover bloqueio' chama deleteBlock.mutate com o id", () => {
    render(<AgendaClient />);
    fireEvent.click(screen.getByText("Almoço"));
    fireEvent.click(screen.getByRole("button", { name: /remover bloqueio/i }));
    expect(mockDeleteBlock.mutate).toHaveBeenCalledWith("b1", expect.any(Object));
  });

  it("clicar em 'Reagendar' no painel chama rescheduleAppt.mutate quando window.prompt retorna valor", () => {
    vi.spyOn(window, "prompt").mockReturnValue("2026-06-15 10:00");
    render(<AgendaClient />);
    fireEvent.click(screen.getByText("Ana Cliente"));
    fireEvent.click(screen.getByRole("button", { name: /reagendar/i }));
    expect(mockRescheduleAppt.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", newSlotIso: expect.stringContaining("2026-06-15") }),
      expect.any(Object),
    );
  });

  it("clicar em 'Reagendar' NÃO chama mutate quando window.prompt é cancelado (null)", () => {
    vi.spyOn(window, "prompt").mockReturnValue(null);
    render(<AgendaClient />);
    fireEvent.click(screen.getByText("Ana Cliente"));
    fireEvent.click(screen.getByRole("button", { name: /reagendar/i }));
    expect(mockRescheduleAppt.mutate).not.toHaveBeenCalled();
  });

  it("botão '+ Bloquear' abre o BlockForm", () => {
    render(<AgendaClient />);
    fireEvent.click(screen.getByRole("button", { name: /bloquear/i }));
    expect(screen.getByRole("form", { name: /formulário de bloqueio/i })).toBeInTheDocument();
  });

  it("abrir o painel de um card fecha o AppointmentForm que estava aberto", () => {
    render(<AgendaClient />);
    // abre o form de criar
    fireEvent.click(screen.getByRole("button", { name: /criar em slot/i }));
    expect(screen.getByRole("form", { name: /novo agendamento/i })).toBeInTheDocument();
    // clicar num card abre o painel e DEVE fechar o form
    fireEvent.click(screen.getByText("Ana Cliente"));
    expect(screen.queryByRole("form", { name: /novo agendamento/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reagendar/i })).toBeInTheDocument();
  });

  it("agendamento com status 'cancelado' não exibe botões 'Reagendar'/'Cancelar' no painel", () => {
    mockUseAgendaReturn = {
      data: {
        appointments: [{ ...mockAppointment, status: "cancelado" }],
        blocks: [],
      },
      isLoading: false,
      isError: false,
    };
    render(<AgendaClient />);
    fireEvent.click(screen.getByText("Ana Cliente"));
    expect(screen.queryByRole("button", { name: /reagendar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancelar/i })).not.toBeInTheDocument();
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

  it("botões 'Semana' e 'Dia' estão presentes para alternar a visão", () => {
    render(<AgendaClient />);
    expect(screen.getByRole("button", { name: /semana/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dia/i })).toBeInTheDocument();
  });

  it("quando data está indefinida, CalendarGrid não é renderizado", () => {
    mockUseAgendaReturn = { data: undefined, isLoading: false, isError: false };
    render(<AgendaClient />);
    expect(screen.queryByTestId("calendar-grid")).not.toBeInTheDocument();
  });

  it("carrega meetLink do appointment no GridItem", () => {
    mockUseAgendaReturn = {
      data: {
        appointments: [{ ...mockAppointment, meetLink: "https://meet.google.com/abc" }],
        blocks: [],
      },
      isLoading: false, isError: false,
    };
    render(<AgendaClient />);
    const appt = capturedItems.find((i) => i.kind === "appt");
    expect(appt?.meetLink).toBe("https://meet.google.com/abc");
  });
});
