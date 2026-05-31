import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mockPathname = vi.fn(() => "/funil");
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));

import { Sidebar, NAV_ITEMS } from "@/components/shell/sidebar";

afterEach(() => cleanup());

describe("Sidebar", () => {
  it("renderiza os 5 itens de navegação", () => {
    render(<Sidebar />);
    for (const item of NAV_ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it("marca aria-current=page no item da rota atual", () => {
    mockPathname.mockReturnValue("/funil");
    render(<Sidebar />);
    expect(screen.getByTestId("nav-/funil")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("nav-/atendimento")).not.toHaveAttribute("aria-current");
  });

  it("considera ativo também em sub-rotas (startsWith)", () => {
    mockPathname.mockReturnValue("/settings/integracoes");
    render(<Sidebar />);
    expect(screen.getByTestId("nav-/settings/integracoes")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
