import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

import { LeadsCard } from "@/components/dashboard/leads-card";
import { MessagesCard } from "@/components/dashboard/messages-card";
import {
  NextMeetingCard,
  formatMeetingWhen,
} from "@/components/dashboard/next-meeting-card";

/**
 * Unit tests dos 3 cards do dashboard D1.
 *
 * Foco: renderização correta com fixtures + format de data
 * (3 buckets: hoje / amanhã / outro dia da semana).
 */

describe("MessagesCard", () => {
  it("renderiza count + comparação up em verde", () => {
    render(<MessagesCard count={17} trend="up" vsYesterday={4} />);
    expect(screen.getByTestId("messages-count")).toHaveTextContent("17");
    const trend = screen.getByText(/4 vs ontem/);
    expect(trend.className).toMatch(/text-emerald-600/);
    expect(trend.textContent).toContain("↑");
  });

  it("renderiza trend down em vermelho", () => {
    render(<MessagesCard count={5} trend="down" vsYesterday={-3} />);
    const trend = screen.getByText(/3 vs ontem/);
    expect(trend.className).toMatch(/text-red-600/);
    expect(trend.textContent).toContain("↓");
  });

  it("renderiza trend flat em cinza sem seta direcional", () => {
    render(<MessagesCard count={10} trend="flat" vsYesterday={0} />);
    const trend = screen.getByText(/0 vs ontem/);
    expect(trend.className).toMatch(/text-muted-foreground/);
    expect(trend.textContent).toContain("→");
  });
});

describe("LeadsCard", () => {
  it("renderiza count + lista de nomes", () => {
    render(
      <LeadsCard count={3} names={["Maria S.", "João P.", "Ana C."]} />
    );
    expect(screen.getByTestId("leads-count")).toHaveTextContent("3");
    const card = screen.getByTestId("leads-card");
    expect(within(card).getByText("Maria S.")).toBeInTheDocument();
    expect(within(card).getByText("João P.")).toBeInTheDocument();
    expect(within(card).getByText("Ana C.")).toBeInTheDocument();
  });

  it("renderiza fallback — quando names vazio", () => {
    render(<LeadsCard count={0} names={[]} />);
    expect(screen.getByTestId("leads-count")).toHaveTextContent("0");
    const card = screen.getByTestId("leads-card");
    expect(within(card).getByText("—")).toBeInTheDocument();
  });
});

describe("NextMeetingCard", () => {
  it("renderiza — quando meeting é null", () => {
    render(<NextMeetingCard meeting={null} />);
    expect(screen.getByTestId("next-meeting-when")).toHaveTextContent("—");
  });

  it("renderiza nome e tópico quando há meeting", () => {
    render(
      <NextMeetingCard
        meeting={{
          withName: "Carla M.",
          whenISO: new Date().toISOString(),
          topic: "Corte + escova",
        }}
      />
    );
    expect(screen.getByText(/com Carla M\./)).toBeInTheDocument();
    expect(screen.getByText("Corte + escova")).toBeInTheDocument();
  });
});

describe("formatMeetingWhen", () => {
  // Fixamos `now` em 2026-05-14 10:00 local pra todos os testes serem
  // determinísticos independente da TZ do CI.
  const now = new Date(2026, 4, 14, 10, 0, 0); // mês 4 = maio (0-indexed)

  it("formata 'Hoje HHhMM' quando data é o mesmo dia", () => {
    const when = new Date(2026, 4, 14, 14, 0, 0).toISOString();
    expect(formatMeetingWhen(when, now)).toBe("Hoje 14h00");
  });

  it("formata 'Amanhã HHhMM' quando é dia seguinte", () => {
    const when = new Date(2026, 4, 15, 9, 30, 0).toISOString();
    expect(formatMeetingWhen(when, now)).toBe("Amanhã 09h30");
  });

  it("formata 'weekday, DD/MM HHhMM' quando é outro dia da semana", () => {
    // 2026-05-20 é uma quarta-feira
    const when = new Date(2026, 4, 20, 14, 0, 0).toISOString();
    expect(formatMeetingWhen(when, now)).toBe("qua, 20/05 14h00");
  });

  it("retorna — pra ISO inválido", () => {
    expect(formatMeetingWhen("not-a-date", now)).toBe("—");
  });
});
