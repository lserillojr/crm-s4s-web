import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const useContactSearch = vi.fn();
vi.mock("@/lib/agenda/use-agenda", () => ({ useContactSearch: (t: string) => useContactSearch(t) }));
import { ContactPicker } from "@/components/agenda/contact-picker";

describe("ContactPicker", () => {
  it("digitar mostra sugestões e escolher chama onPick", () => {
    useContactSearch.mockReturnValue({ data: [{ id: 7, name: "Ana Silva", phone: "11", email: "a@x" }], isFetching: false });
    const onPick = vi.fn();
    render(<ContactPicker value="" onChange={() => {}} onPick={onPick} onCreateNew={() => {}} disabled={false} />);
    fireEvent.change(screen.getByLabelText(/cliente/i), { target: { value: "Ana" } });
    fireEvent.click(screen.getByText(/Ana Silva/));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });
  it("sem match, oferece criar novo", () => {
    useContactSearch.mockReturnValue({ data: [], isFetching: false });
    const onCreateNew = vi.fn();
    render(<ContactPicker value="Zez" onChange={() => {}} onPick={() => {}} onCreateNew={onCreateNew} disabled={false} />);
    fireEvent.change(screen.getByLabelText(/cliente/i), { target: { value: "Zezinho" } });
    fireEvent.click(screen.getByText(/criar novo/i));
    expect(onCreateNew).toHaveBeenCalledWith("Zezinho");
  });
});
