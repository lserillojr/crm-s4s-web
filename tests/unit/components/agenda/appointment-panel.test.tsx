import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppointmentPanel } from "@/components/agenda/appointment-panel";
import type { GridItem } from "@/components/agenda/calendar-grid";

const appt: GridItem = {
  kind: "appt", id: "a1", start: new Date(2026, 8, 10, 13, 0), end: new Date(2026, 8, 10, 14, 0),
  label: "Ana — corte", source: "manual", status: "confirmado",
};

function renderPanel(item: GridItem, onReschedule = vi.fn()) {
  render(
    <AppointmentPanel item={item} isPending={false} onClose={() => {}}
      onReschedule={onReschedule} onCancel={() => {}} onDeleteBlock={() => {}} />,
  );
  return { onReschedule };
}

describe("AppointmentPanel — reagendar inline", () => {
  it("clicar Reagendar mostra um datetime-local pré-preenchido", () => {
    renderPanel(appt);
    fireEvent.click(screen.getByRole("button", { name: /^reagendar$/i }));
    const input = screen.getByLabelText(/nova data e hora/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("2026-09-10T13:00");
  });

  it("Confirmar chama onReschedule com ISO com offset", () => {
    const { onReschedule } = renderPanel(appt);
    fireEvent.click(screen.getByRole("button", { name: /^reagendar$/i }));
    fireEvent.change(screen.getByLabelText(/nova data e hora/i), { target: { value: "2026-09-11T10:30" } });
    fireEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));
    expect(onReschedule).toHaveBeenCalledTimes(1);
    expect(onReschedule.mock.calls[0]![0]).toMatchObject({ id: "a1" });
    expect(onReschedule.mock.calls[0]![1]).toMatch(/^2026-09-11T10:30:00[+-]\d{2}:\d{2}$/);
  });
});

describe("AppointmentPanel — link do Meet", () => {
  it("mostra o link e copia ao clicar Copiar", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderPanel({ ...appt, meetLink: "https://meet.google.com/abc-defg-hij" });
    expect(screen.getByText("https://meet.google.com/abc-defg-hij")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /copiar/i }));
    expect(writeText).toHaveBeenCalledWith("https://meet.google.com/abc-defg-hij");
  });

  it("sem meetLink, não mostra bloco de videochamada", () => {
    renderPanel(appt);
    expect(screen.queryByText(/videochamada/i)).not.toBeInTheDocument();
  });
});
