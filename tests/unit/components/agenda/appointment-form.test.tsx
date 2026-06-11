import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppointmentForm } from "@/components/agenda/appointment-form";

vi.mock("@/components/agenda/contact-picker", () => ({
  ContactPicker: ({ onPick, onCreateNew }: { onPick: (c: unknown) => void; onCreateNew: (n: string) => void }) => (
    <div>
      <button type="button" onClick={() => onPick({ id: 7, name: "Ana", phone: "11", email: "a@x.com" })}>pick-ana</button>
      <button type="button" onClick={() => onCreateNew("Zezinho")}>create-zez</button>
    </div>
  ),
}));

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
    // ContactPicker is mocked — click pick-ana to set contactName = "Ana"
    fireEvent.click(screen.getByText("pick-ana"));
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

  it("escolher contato Odoo → odooPartnerId + contactEmail no submit", () => {
    const onSubmit = vi.fn();
    render(<AppointmentForm isPending={false} isError={false} isConflict={false}
      defaultStart="2026-09-10T13:00" defaultDurationMin={60} onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByText("pick-ana"));
    fireEvent.submit(screen.getByRole("form", { name: /novo agendamento/i }));
    const d = onSubmit.mock.calls[0]![0];
    expect(d.odooPartnerId).toBe(7); expect(d.contactEmail).toBe("a@x.com"); expect(d.contactName).toBe("Ana");
  });

  it("toggle convite só habilita com online + contato com email", () => {
    render(<AppointmentForm isPending={false} isError={false} isConflict={false}
      defaultStart="2026-09-10T13:00" defaultDurationMin={60} onSubmit={() => {}} onCancel={() => {}} />);
    const invite = () => screen.getByLabelText(/convidar o cliente/i) as HTMLInputElement;
    expect(invite().disabled).toBe(true);
    fireEvent.click(screen.getByText("pick-ana"));
    fireEvent.click(screen.getByLabelText(/reunião online/i));
    expect(invite().disabled).toBe(false);
  });
});
