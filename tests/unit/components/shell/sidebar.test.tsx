import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const mockPathname = vi.fn(() => "/funil");
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));

import { Sidebar, NAV_ITEMS } from "@/components/shell/sidebar";

afterEach(() => {
  cleanup();
  mockPathname.mockReturnValue("/funil");
});

describe("Sidebar", () => {
  it("renderiza os 6 itens de navegação de topo", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    for (const item of NAV_ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
    expect(NAV_ITEMS).toHaveLength(6);
  });

  it("inclui o item Relatórios apontando para /relatorios", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    const link = screen.getByRole("link", { name: /Relatórios/ });
    expect(link).toHaveAttribute("href", "/relatorios");
  });

  it("marca aria-current=page no item da rota atual", () => {
    mockPathname.mockReturnValue("/funil");
    render(<Sidebar />);
    expect(screen.getByTestId("nav-/funil")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("nav-/atendimento")).not.toHaveAttribute("aria-current");
  });

  it("mantém Config colapsado fora de /settings e revela as 3 seções ao clicar", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    expect(screen.queryByTestId("nav-/settings/kb")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("nav-/settings"));

    expect(screen.getByTestId("nav-/settings/integracoes")).toBeInTheDocument();
    expect(screen.getByTestId("nav-/settings/kb")).toBeInTheDocument();
    expect(screen.getByTestId("nav-/settings/working-hours")).toBeInTheDocument();
  });

  it("auto-expande Config quando a rota atual é uma sub-rota de settings", () => {
    mockPathname.mockReturnValue("/settings/kb");
    render(<Sidebar />);
    const kb = screen.getByTestId("nav-/settings/kb");
    expect(kb).toBeInTheDocument();
    expect(kb).toHaveAttribute("aria-current", "page");
  });

  it("subitens apontam para as rotas de cada seção", () => {
    mockPathname.mockReturnValue("/settings/integracoes");
    render(<Sidebar />);
    expect(screen.getByTestId("nav-/settings/integracoes")).toHaveAttribute(
      "href",
      "/settings/integracoes",
    );
    expect(screen.getByTestId("nav-/settings/working-hours")).toHaveAttribute(
      "href",
      "/settings/working-hours",
    );
  });
});
