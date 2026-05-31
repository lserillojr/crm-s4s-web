import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EmbeddedFrame } from "@/components/shell/embedded-frame";

afterEach(() => cleanup());

describe("EmbeddedFrame", () => {
  it("renderiza o iframe com src e title quando há URL", () => {
    render(<EmbeddedFrame src="https://chat.example.com/?embed=s4s" title="Atendimento" />);
    const frame = screen.getByTestId("embedded-frame") as HTMLIFrameElement;
    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute("src", "https://chat.example.com/?embed=s4s");
    expect(frame).toHaveAttribute("title", "Atendimento");
  });

  it("renderiza fallback (sem iframe) quando src é null", () => {
    render(<EmbeddedFrame src={null} title="Funil" />);
    expect(screen.queryByTestId("embedded-frame")).not.toBeInTheDocument();
    expect(screen.getByTestId("embedded-frame-fallback")).toBeInTheDocument();
    expect(screen.getByText(/indispon[íi]vel/i)).toBeInTheDocument();
  });
});
