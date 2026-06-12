import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "@/components/ui/modal";

describe("Modal", () => {
  it("renderiza o conteúdo dentro de um role=dialog com o aria-label", () => {
    render(
      <Modal onClose={() => {}} ariaLabel="Meu diálogo">
        <p>conteúdo</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: /meu diálogo/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("fecha ao pressionar Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} ariaLabel="x">
        <p>c</p>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fecha ao clicar no overlay (fora do card)", () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} ariaLabel="x">
        <p>c</p>
      </Modal>,
    );
    // o overlay é o elemento role=presentation
    fireEvent.click(screen.getByRole("presentation"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("NÃO fecha ao clicar dentro do card", () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} ariaLabel="x">
        <button type="button">interno</button>
      </Modal>,
    );
    fireEvent.click(screen.getByText("interno"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
