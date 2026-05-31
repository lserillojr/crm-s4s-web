import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { SettingsHub } from "@/components/settings/settings-hub";
import { SETTINGS_SECTIONS } from "@/lib/settings-sections";

afterEach(() => cleanup());

describe("SettingsHub", () => {
  it("renderiza um card-link por seção com label e descrição", () => {
    render(<SettingsHub />);
    for (const s of SETTINGS_SECTIONS) {
      const card = screen.getByTestId(`settings-card-${s.href}`);
      expect(card).toHaveAttribute("href", s.href);
      expect(within(card).getByText(s.label)).toBeInTheDocument();
      expect(within(card).getByText(s.description)).toBeInTheDocument();
    }
  });

  it("expõe exatamente uma entrada por seção configurada", () => {
    render(<SettingsHub />);
    const cards = screen.getAllByTestId(/^settings-card-/);
    expect(cards).toHaveLength(SETTINGS_SECTIONS.length);
  });
});
