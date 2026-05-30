import { test, expect } from "@playwright/test";

/**
 * E2E do wizard step calendar com OAuth Google mockado.
 *
 * Cobre:
 * - error path: ?error=invalid_state → mensagem amigável + "Tentar de novo"
 * - skip path: clique "Conectar depois" → disclaimer + "Conectar agora"
 *
 * Happy path completo (OAuth real → callback → connected) requer mock de
 * accounts.google.com — coberto pelos unit tests da Task 5 (callback) e
 * pelo smoke real da Task 9.
 */

test.describe("Wizard calendar OAuth (Google mockado)", () => {
  test("error path: ?error=invalid_state mostra mensagem amigável + botão 'Tentar de novo'", async ({
    page,
  }) => {
    await page.goto("/wizard/calendar?error=invalid_state");
    await expect(page.getByText(/sessão|estado/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /tentar de novo/i })
    ).toBeVisible();
  });

  test("skipped path: clicar 'Conectar depois' troca o estado pra disclaimer + botão 'Conectar agora'", async ({
    page,
  }) => {
    await page.goto("/wizard/calendar");
    await page.getByRole("button", { name: /conectar depois/i }).click();
    await expect(page.getByText(/atendente confirma/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /conectar agora/i })
    ).toBeVisible();
  });
});
