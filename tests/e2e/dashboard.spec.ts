import { test, expect } from "@playwright/test";

/**
 * Smoke E2E do dashboard D1 (Story 7.5-DEV).
 *
 * Fase 1 — Server Component com dados hardcoded:
 * GET /dashboard → saudação + 3 cards KPI + aviso fase 1.
 *
 * Fase 2 (próxima): a página fará fetch ao /api/dashboard/summary
 * (já testado separadamente abaixo) que vira proxy do WF05 quando
 * Auth/Keycloak conectar tenant_id ao request.
 */

test("/dashboard mostra os 3 cards KPI com dados mock", async ({ page }) => {
  await page.goto("/dashboard");

  // Saudação
  const greeting = page.getByTestId("dashboard-greeting");
  await expect(greeting).toBeVisible();
  await expect(greeting).toContainText(/Bem-vinda,\s*Maria/);

  // Card 1 — Mensagens hoje: 12
  const messages = page.getByTestId("card-messages-today");
  await expect(messages).toBeVisible();
  await expect(messages.getByText("Mensagens hoje")).toBeVisible();
  await expect(messages.getByText("12")).toBeVisible();

  // Card 2 — Leads novos esta semana: 3
  const leads = page.getByTestId("card-new-leads-week");
  await expect(leads).toBeVisible();
  await expect(leads.getByText("Leads novos esta semana")).toBeVisible();
  await expect(leads.getByText("3")).toBeVisible();

  // Card 3 — Próxima reunião: Hoje, 16h
  const meeting = page.getByTestId("card-next-meeting");
  await expect(meeting).toBeVisible();
  await expect(meeting.getByText("Próxima reunião")).toBeVisible();
  await expect(meeting.getByText("Hoje, 16h")).toBeVisible();

  // Aviso de fase 1
  await expect(page.getByTestId("dashboard-phase1-notice")).toBeVisible();
});

test("/api/dashboard/summary retorna payload mock esperado (fase 2)", async ({
  request,
}) => {
  const resp = await request.get("/api/dashboard/summary");
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  expect(body.messagesToday.count).toBe(17);
  expect(body.messagesToday.trend).toBe("up");
  expect(body.messagesToday.vsYesterday).toBe(4);
  expect(body.leadsNew.count).toBe(3);
  expect(body.leadsNew.names).toEqual(["Maria S.", "João P.", "Ana C."]);
  expect(body.nextMeeting.withName).toBe("Carla M.");
});
