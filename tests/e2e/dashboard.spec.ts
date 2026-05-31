import { test, expect } from "@playwright/test";

/**
 * Smoke E2E do dashboard D1 (Story 7.5-DEV — fase 2).
 *
 * A página virou client component: consome `useDashboardSummary()` que faz
 * fetch ao `/api/dashboard/summary` (proxy do WF05, autenticado via session).
 *
 * Em DEV sem o WF configurado o route degrada (200, blocos null) — os cards
 * mostram estados neutros ("—"/0). Por isso o smoke afirma só PRESENÇA:
 * saudação visível + os 3 cards montados. Valores específicos dependem do WF
 * + tenant real e ficam fora do escopo deste E2E.
 */

test("/dashboard mostra saudação + os 3 cards", async ({ page }) => {
  await page.goto("/dashboard");

  // Saudação (nome do usuário vem da session do mock auth)
  await expect(page.getByTestId("dashboard-greeting")).toBeVisible();

  // Os 3 cards reais montados
  await expect(page.getByTestId("messages-card")).toBeVisible();
  await expect(page.getByTestId("leads-card")).toBeVisible();
  await expect(page.getByTestId("next-meeting-card")).toBeVisible();

  // Aviso de fase 1 não existe mais
  await expect(page.getByTestId("dashboard-phase1-notice")).toHaveCount(0);
});
