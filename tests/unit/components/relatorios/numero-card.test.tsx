import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NumeroCard } from "@/components/relatorios/numero-card";

describe("NumeroCard", () => {
  it("mostra a frase e o valor em destaque", () => {
    render(<NumeroCard destaque="83" frase="A IA atendeu 83 clientes pra você" />);
    expect(screen.getByText("83")).toBeInTheDocument();
    expect(
      screen.getByText("A IA atendeu 83 clientes pra você"),
    ).toBeInTheDocument();
  });
});
