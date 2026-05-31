import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

afterEach(() => {
  cleanup();
});

const happyData = {
  greeting: { userName: "João", businessName: "Salão da Maria" },
  weekConversations: 47,
  conversationsToday: { count: 12, trend: "up", vsYesterday: 3 },
  leadsNew: { count: 2, names: ["Ana", "Bia"] },
  nextMeeting: null,
};

let mockReturn: { isLoading: boolean; isError: boolean; data: typeof happyData | undefined };

vi.mock("@/lib/dashboard/use-dashboard-summary", () => ({
  useDashboardSummary: () => mockReturn,
}));

beforeEach(() => {
  mockReturn = { isLoading: false, isError: false, data: happyData };
});

describe("DashboardPage", () => {
  it("saúda usuário + indica negócio e renderiza os 3 cards", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("dashboard-greeting")).toHaveTextContent("João");
    expect(screen.getByTestId("dashboard-greeting")).toHaveTextContent("Salão da Maria");
    expect(screen.getByTestId("messages-card")).toBeInTheDocument();
    expect(screen.getByTestId("leads-card")).toBeInTheDocument();
    expect(screen.getByTestId("next-meeting-card")).toBeInTheDocument();
  });

  it("nextMeeting null → card mostra estado neutro", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("next-meeting-when")).toHaveTextContent("—");
  });

  it("não mostra mais o aviso de dados de exemplo", () => {
    render(<DashboardPage />);
    expect(screen.queryByTestId("dashboard-phase1-notice")).toBeNull();
  });

  it("estado de carregamento mostra 'Carregando seu resumo…'", () => {
    mockReturn = { isLoading: true, isError: false, data: undefined };
    render(<DashboardPage />);
    expect(screen.getByText("Carregando seu resumo…")).toBeInTheDocument();
  });

  it("estado de erro total mostra o aviso de falha", () => {
    mockReturn = { isLoading: false, isError: true, data: undefined };
    render(<DashboardPage />);
    expect(screen.getByText(/Não foi possível carregar/i)).toBeInTheDocument();
  });
});
