import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

import { WorkingHoursForm } from "@/components/working-hours-form";
import {
  weeklyHoursDefaults,
  type WeeklyHours,
} from "@/lib/working-hours/schema";

function clone(): WeeklyHours {
  return structuredClone(weeklyHoursDefaults);
}

describe("WorkingHoursForm", () => {
  it("renderiza 7 dias com labels pt-BR", () => {
    render(
      <WorkingHoursForm value={weeklyHoursDefaults} onChange={() => {}} />
    );
    for (const label of ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]) {
      // múltiplos elementos podem ter o mesmo texto (label + sr-only) —
      // basta provar que existe algum.
      const found = screen.getAllByText(label);
      expect(found.length).toBeGreaterThan(0);
    }
  });

  it("clicar em 'Preencher segunda a sexta...' propaga horário da segunda pros dias úteis", () => {
    const initial: WeeklyHours = clone();
    // muda segunda pra um horário distinto pra ver a propagação
    initial.monday = { closed: false, open: "08:30", close: "17:30" };
    // terça começa diferente
    initial.tuesday = { closed: false, open: "09:00", close: "18:00" };

    const onChange = vi.fn();
    render(<WorkingHoursForm value={initial} onChange={onChange} />);

    fireEvent.click(
      screen.getByRole("button", { name: /preencher segunda a sexta/i })
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]?.[0] as WeeklyHours;
    expect(next.monday).toEqual({
      closed: false,
      open: "08:30",
      close: "17:30",
    });
    expect(next.tuesday).toEqual(next.monday);
    expect(next.wednesday).toEqual(next.monday);
    expect(next.thursday).toEqual(next.monday);
    expect(next.friday).toEqual(next.monday);
    // sáb/dom não devem mudar
    expect(next.saturday).toEqual(initial.saturday);
    expect(next.sunday).toEqual(initial.sunday);
  });

  it("marcar 'Fechado' em segunda desabilita os inputs de horário", () => {
    const initial: WeeklyHours = clone();
    let current = initial;
    const onChange = vi.fn((next: WeeklyHours) => {
      current = next;
    });

    const { rerender } = render(
      <WorkingHoursForm value={current} onChange={onChange} />
    );

    const checkbox = screen.getByRole("checkbox", {
      name: /seg fechado/i,
    }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalled();
    expect(current.monday.closed).toBe(true);

    // re-renderiza com o novo valor pra refletir disabled
    rerender(<WorkingHoursForm value={current} onChange={onChange} />);

    const openInput = screen.getByLabelText(
      /hora de abertura seg/i
    ) as HTMLInputElement;
    const closeInput = screen.getByLabelText(
      /hora de fechamento seg/i
    ) as HTMLInputElement;
    expect(openInput.disabled).toBe(true);
    expect(closeInput.disabled).toBe(true);
  });
});
