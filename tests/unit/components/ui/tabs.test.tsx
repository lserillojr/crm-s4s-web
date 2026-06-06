import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Tabs } from "@/components/ui/tabs";

const items = [
  { value: "a", label: "Aba A", content: <p>Conteúdo A</p> },
  { value: "b", label: "Aba B", content: <p>Conteúdo B</p> },
];

describe("Tabs", () => {
  it("mostra a primeira aba por padrão", () => {
    render(<Tabs items={items} />);
    expect(screen.getByText("Conteúdo A")).toBeVisible();
    expect(screen.queryByText("Conteúdo B")).not.toBeVisible();
  });
  it("troca de aba ao clicar", async () => {
    render(<Tabs items={items} />);
    await userEvent.click(screen.getByRole("tab", { name: "Aba B" }));
    expect(screen.getByText("Conteúdo B")).toBeVisible();
  });
});
