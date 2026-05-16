import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import DashboardPage from "@/app/(dashboard)/dashboard/page";

afterEach(() => {
  cleanup();
});

/**
 * Unit tests do `/dashboard` (Story 7.5-DEV fase 1 — mock hardcoded).
 *
 * Cobre o golden render do MEI logando pela primeira vez:
 * - saudação + subtítulo contextual
 * - 3 cards KPI com títulos visíveis em pt-BR
 * - contagem 12 no card de mensagens
 * - aviso de fase 1 indicando que os números são exemplos
 *
 * Quando o fetch real do WF05 entrar (fase 2), esses testes seguem valendo
 * desde que o mock vire fixture com a mesma forma.
 */
describe("DashboardPage", () => {
  it("renderiza saudação 'Bem-vinda, Maria'", () => {
    render(<DashboardPage />);
    const greeting = screen.getByTestId("dashboard-greeting");
    expect(greeting).toHaveTextContent(/Bem-vinda,\s*Maria/);
  });

  it("renderiza os 3 cards de KPI com títulos esperados", () => {
    render(<DashboardPage />);

    const messagesCard = screen.getByTestId("card-messages-today");
    expect(within(messagesCard).getByText("Mensagens hoje")).toBeInTheDocument();

    const leadsCard = screen.getByTestId("card-new-leads-week");
    expect(
      within(leadsCard).getByText("Leads novos esta semana")
    ).toBeInTheDocument();

    const meetingCard = screen.getByTestId("card-next-meeting");
    expect(
      within(meetingCard).getByText("Próxima reunião")
    ).toBeInTheDocument();
  });

  it("mostra contagem 12 no card de mensagens", () => {
    render(<DashboardPage />);
    const messagesCard = screen.getByTestId("card-messages-today");
    expect(within(messagesCard).getByText("12")).toBeInTheDocument();
    expect(
      within(messagesCard).getByText("+3 nos últimos 30 minutos")
    ).toBeInTheDocument();
  });

  it("mostra aviso de fase 1 ('Dados mostrados são exemplos')", () => {
    render(<DashboardPage />);
    const notice = screen.getByTestId("dashboard-phase1-notice");
    expect(notice).toHaveTextContent(/Dados mostrados são exemplos/);
  });
});
