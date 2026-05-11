import { test, expect } from "@playwright/test";

/**
 * Smoke E2E SP2 fase 1.
 *
 * Cobre 3 fluxos críticos pos-deploy:
 * - Landing renderiza com CTAs principais
 * - /api/healthz responde (200 com db ok ou 503 com db error — ambos OK pro smoke)
 * - /login mostra estado fase 1 "coming soon" com botão disabled
 */

test("landing renderiza com CTA e links", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/S4S Recepcionista IA/);
  await expect(
    page.getByRole("heading", { name: "S4S Recepcionista IA" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Começar grátis 7 dias" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Já tenho conta" })
  ).toBeVisible();
});

test("/api/healthz responde (200 ou 503 sao validos no smoke fase 1)", async ({
  request,
}) => {
  const resp = await request.get("/api/healthz");
  // Em fase 1 sem DB real, aceitamos 200 ou 503; deploy DEV terá 200
  expect([200, 503]).toContain(resp.status());
  const body = await resp.json();
  expect(body.status).toMatch(/^(ok|degraded)$/);
  expect(body.checks).toBeDefined();
  expect(body.checks.db).toMatch(/^(ok|error)$/);
});

test("/login mostra placeholder fase 1", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText(/Login coming soon/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Entrar.*em breve/i })
  ).toBeDisabled();
});
