import { test, expect } from "@playwright/test";

/**
 * Smoke E2E da tela /agenda (Onda 1 — só-leitura).
 *
 * A página consome `useAgenda(from, to)` → `/api/agenda/list`, que VALIDA a
 * resposta contra o contrato Zod. O E2E MOCKA a rota com um payload válido e
 * afirma o caminho feliz: o agendamento aparece na lista, agrupado por dia.
 */

const payload = {
  appointments: [
    {
      id: "a1",
      start: "2026-06-08T13:00:00Z",
      end: "2026-06-08T14:00:00Z",
      contactName: "Ana Cliente",
      status: "confirmado",
      source: "ia",
    },
  ],
  blocks: [
    {
      id: "b1",
      start: "2026-06-08T18:00:00Z",
      end: "2026-06-08T19:00:00Z",
      reason: "Almoço",
    },
  ],
};

test("/agenda mostra os compromissos vindos da API", async ({ page }) => {
  await page.route("**/api/agenda/list**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  );

  await page.goto("/agenda");

  await expect(page.getByText("Ana Cliente")).toBeVisible();
  await expect(page.getByText("Almoço")).toBeVisible();
  await expect(page.getByText("bloqueio")).toBeVisible();
});
