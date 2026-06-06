import { test, expect } from "@playwright/test";

/**
 * Smoke E2E da tela /relatorios (Ag-1b — painel "Resumo").
 *
 * A página consome `useRelatoriosSummary(days)` → `/api/relatorios/summary`, que
 * VALIDA a resposta contra o contrato Zod. Diferente do dashboard (que degrada
 * para nulls), aqui um WF ausente devolve 502 → estado de erro. Por isso o E2E
 * MOCKA a rota com um payload válido do contrato e afirma o caminho feliz:
 * cards renderizados como frases MEI + troca de período refazendo a query.
 */

const payload = {
  period: { days: 30, from: "2026-05-06", to: "2026-06-05" },
  ia: { conversasAtendidas: 83, tempoRespostaSegundos: 12, foraHorario: 31 },
  agenda: { agendados: 14, faltas: null, remarcacoes: null },
  funil: { etapaTrava: "Orçamento", motivoPerdaTop: "Preço" },
  pico: { diaSemana: "terça", faixaHorario: "19h–21h" },
  csat: null,
};

test("/relatorios mostra os números curados e troca o período", async ({ page }) => {
  await page.route("**/api/relatorios/summary**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  );

  await page.goto("/relatorios");

  // frases em linguagem MEI renderizadas a partir do contrato
  await expect(
    page.getByText("A IA atendeu 83 clientes pra você"),
  ).toBeVisible();
  await expect(
    page.getByText("A IA marcou 14 horários na sua agenda"),
  ).toBeVisible();
  await expect(page.getByText(/A maioria para em "Orçamento"/)).toBeVisible();

  // cards de fase 2 (pico + fora-do-horário)
  await expect(
    page.getByText("31 clientes atendidos fora do expediente"),
  ).toBeVisible();
  await expect(page.getByText("Seu pico é terça, 19h–21h")).toBeVisible();

  // flag reports_detailed_enabled = false (default) → sem aba "Detalhado"
  await expect(page.getByRole("tab", { name: "Detalhado" })).toHaveCount(0);

  // troca o período → refaz a query (mesmo mock) → segue visível
  await page.getByRole("button", { name: "7 dias" }).click();
  await expect(
    page.getByText("A IA atendeu 83 clientes pra você"),
  ).toBeVisible();
});
