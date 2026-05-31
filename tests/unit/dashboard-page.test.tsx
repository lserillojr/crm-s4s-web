import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

afterEach(() => {
  cleanup();
});

vi.mock("@/lib/dashboard/use-dashboard-summary", () => ({
  useDashboardSummary: () => ({
    isLoading: false, isError: false,
    data: {
      greeting: { userName: "João", businessName: "Salão da Maria" },
      weekConversations: 47,
      conversationsToday: { count: 12, trend: "up", vsYesterday: 3 },
      leadsNew: { count: 2, names: ["Ana", "Bia"] },
      nextMeeting: null,
    },
  }),
}));

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
});
