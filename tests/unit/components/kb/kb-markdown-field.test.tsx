import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { KbMarkdownField } from "@/components/kb/kb-markdown-field";

afterEach(() => {
  cleanup();
});

describe("KbMarkdownField", () => {
  it("renderiza o valor e dispara onChange ao digitar", () => {
    const onChange = vi.fn();
    render(<KbMarkdownField value="texto inicial" onChange={onChange} />);
    const ta = screen.getByRole("textbox");
    expect((ta as HTMLTextAreaElement).value).toBe("texto inicial");
    fireEvent.change(ta, { target: { value: "novo" } });
    expect(onChange).toHaveBeenCalledWith("novo");
  });
  it("mostra preview do markdown", () => {
    render(<KbMarkdownField value="# Título" onChange={() => {}} />);
    expect(screen.getByTestId("kb-preview").textContent).toContain("Título");
  });
});
