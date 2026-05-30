import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { InstagramCard } from "@/components/integrations/instagram-card";

afterEach(() => {
  cleanup();
});

describe("InstagramCard", () => {
  it("renderiza título Instagram", () => {
    render(<InstagramCard />);
    expect(screen.getByText("Instagram")).toBeInTheDocument();
  });

  it("exibe 'Disponível na fase 2'", () => {
    render(<InstagramCard />);
    expect(screen.getByText(/Disponível na fase 2/i)).toBeInTheDocument();
  });

  it("não tem nenhum botão clicável", () => {
    render(<InstagramCard />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renderiza StatusPill com level=unavailable", () => {
    render(<InstagramCard />);
    expect(screen.getByTestId("status-pill-unavailable")).toBeInTheDocument();
  });
});
