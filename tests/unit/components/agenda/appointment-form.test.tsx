import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppointmentForm } from "@/components/agenda/appointment-form";

describe("AppointmentForm", () => {
  it("submete startIso com offset + durationMin number", () => {
    const onSubmit = vi.fn();
    render(
      <AppointmentForm
        isPending={false}
        isError={false}
        isConflict={false}
        defaultStart="2026-09-10T13:00"
        defaultDurationMin={60}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/cliente/i), { target: { value: "Ana" } });
    fireEvent.submit(screen.getByRole("form", { name: /novo agendamento/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const arg = onSubmit.mock.calls[0]![0];
    expect(arg.durationMin).toBe(60);
    expect(arg.startIso).toMatch(/2026-09-10T13:00:00[+-]\d{2}:\d{2}/);
    expect(arg.contactName).toBe("Ana");
  });

  it("mostra aviso de horário ocupado quando isConflict", () => {
    render(
      <AppointmentForm isPending={false} isError={false} isConflict={true}
        defaultStart="2026-09-10T13:00" defaultDurationMin={60}
        onSubmit={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByText(/já está ocupado/i)).toBeInTheDocument();
  });

  it("marca 'Reunião online' → online=true no submit", () => {
    const onSubmit = vi.fn();
    render(
      <AppointmentForm isPending={false} isError={false} isConflict={false}
        defaultStart="2026-09-10T13:00" defaultDurationMin={60}
        onSubmit={onSubmit} onCancel={() => {}} />,
    );
    fireEvent.click(screen.getByLabelText(/reunião online/i));
    fireEvent.submit(screen.getByRole("form", { name: /novo agendamento/i }));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(onSubmit.mock.calls[0]![0].online).toBe(true);
  });

  it("sem marcar → online ausente/false no submit", () => {
    const onSubmit = vi.fn();
    render(
      <AppointmentForm isPending={false} isError={false} isConflict={false}
        defaultStart="2026-09-10T13:00" defaultDurationMin={60}
        onSubmit={onSubmit} onCancel={() => {}} />,
    );
    fireEvent.submit(screen.getByRole("form", { name: /novo agendamento/i }));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(onSubmit.mock.calls[0]![0].online).toBeFalsy();
  });
});
