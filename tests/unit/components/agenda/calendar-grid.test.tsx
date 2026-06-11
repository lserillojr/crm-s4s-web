import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarGrid, type GridItem } from "@/components/agenda/calendar-grid";

const weekStart = new Date(2026, 5, 8); // segunda 08/06/2026

const items: GridItem[] = [
  { kind: "appt", id: "a1", start: new Date(2026, 5, 8, 9, 0), end: new Date(2026, 5, 8, 10, 0), label: "Ana — corte", source: "manual", status: "confirmado" },
  { kind: "appt", id: "a2", start: new Date(2026, 5, 9, 14, 0), end: new Date(2026, 5, 9, 14, 40), label: "João", source: "ia", status: "confirmado" },
  { kind: "block", id: "b1", start: new Date(2026, 5, 8, 12, 0), end: new Date(2026, 5, 8, 13, 0), label: "Almoço", source: "block", status: "" },
];

describe("CalendarGrid", () => {
  it("renderiza os cards da semana com seus rótulos", () => {
    render(<CalendarGrid weekStart={weekStart} dayCount={6} items={items} onCreateAt={() => {}} onSelect={() => {}} />);
    expect(screen.getByText("Ana — corte")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();
    expect(screen.getByText("Almoço")).toBeInTheDocument();
  });

  it("clique no card chama onSelect com o item", () => {
    const onSelect = vi.fn();
    render(<CalendarGrid weekStart={weekStart} dayCount={6} items={items} onCreateAt={() => {}} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Ana — corte"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
  });

  it("clique numa célula vazia chama onCreateAt com um Date naquele dia/hora", () => {
    const onCreateAt = vi.fn();
    render(<CalendarGrid weekStart={weekStart} dayCount={6} items={items} onCreateAt={onCreateAt} onSelect={() => {}} />);
    const cells = screen.getAllByLabelText(/^Criar em /);
    const cell = cells[0];
    expect(cell).toBeDefined();
    fireEvent.click(cell!);
    expect(onCreateAt).toHaveBeenCalledTimes(1);
    const firstCall = onCreateAt.mock.calls[0]!;
    const when = firstCall[0] as Date;
    expect(when).toBeInstanceOf(Date);
    // primeira célula = 1ª coluna (08/06, seg) na 1ª hora da grade (GRID_START_HOUR=07h)
    expect(when.getFullYear()).toBe(2026);
    expect(when.getMonth()).toBe(5);
    expect(when.getDate()).toBe(8);
    expect(when.getHours()).toBe(7);
    expect(when.getMinutes()).toBe(0);
  });
});
