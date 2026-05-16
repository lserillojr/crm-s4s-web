import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Unit tests do step KB do wizard (Story 7.4).
 *
 * Cobre:
 * - Renderização básica (título visível)
 * - Botão "Usar template" aparece quando about está vazio + vertical != "outro"
 * - Aplicar template preenche o textarea com conteúdo da vertical
 * - Preview markdown renderiza heading <h1> quando textarea contém `# titulo`
 *
 * Mock de next/navigation porque a página chama useRouter() no top level.
 * Reset do store entre testes pra cada caso começar com defaults.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import KbStepPage from "@/app/(onboarding)/wizard/kb/page";
import { useWizardStore } from "@/lib/wizard/store";
import { wizardDefaults } from "@/lib/wizard/schemas";

describe("KbStepPage", () => {
  beforeEach(() => {
    // Reset store pra defaults antes de cada teste — Zustand persiste em
    // memória entre testes mesmo sem localStorage.
    useWizardStore.setState({
      data: wizardDefaults,
      furthestCompletedStep: null,
      hydrated: true,
    });
  });

  // Vitest com globals:false não chama RTL.cleanup automaticamente — sem isso,
  // múltiplos render() empilham DOM e queries by-label/role falham com
  // "multiple elements found".
  afterEach(() => {
    cleanup();
  });

  it("renderiza o título 'Conte pra IA sobre o seu negócio'", () => {
    render(<KbStepPage />);
    expect(
      screen.getByText("Conte pra IA sobre o seu negócio")
    ).toBeInTheDocument();
  });

  it("mantém o label 'O que a IA precisa saber' (contrato E2E)", () => {
    render(<KbStepPage />);
    // E2E walkthrough seleciona o textarea por esse label exato.
    expect(screen.getByLabelText("O que a IA precisa saber")).toBeInTheDocument();
  });

  it("mostra o botão 'Usar template' com vertical default (beleza)", () => {
    render(<KbStepPage />);
    const btn = screen.getByRole("button", { name: /Usar template de Beleza/i });
    expect(btn).toBeInTheDocument();
  });

  it("clicar em 'Usar template' preenche o textarea com conteúdo da vertical", async () => {
    const user = userEvent.setup();
    render(<KbStepPage />);

    const btn = screen.getByRole("button", { name: /Usar template de Beleza/i });
    await user.click(btn);

    const textarea = screen.getByLabelText(
      "O que a IA precisa saber"
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain("Salão de Beleza");
    expect(textarea.value).toContain("Corte feminino");
  });

  it("preview renderiza heading h1 quando textarea contém '# titulo'", async () => {
    const user = userEvent.setup();
    render(<KbStepPage />);

    const textarea = screen.getByLabelText("O que a IA precisa saber");
    await user.type(textarea, "# titulo");

    const preview = screen.getByTestId("kb-preview");
    const heading = preview.querySelector("h1");
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toBe("titulo");
  });
});
