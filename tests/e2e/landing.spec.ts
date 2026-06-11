import { test, expect } from "@playwright/test";

/**
 * Smoke E2E SP2 fase 2.
 *
 * Cobre 3 fluxos críticos pos-deploy:
 * - Landing renderiza com CTAs principais
 * - /api/healthz responde (200 com db ok ou 503 com db error — ambos OK pro smoke)
 * - /login mostra formulário de login (fase 2: botão Entrar com S4S ativo)
 */

test("landing renderiza com CTAs que disparam o SSO direto", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/S4S Recepcionista IA/);
  await expect(
    page.getByRole("heading", { name: "S4S Recepcionista IA" })
  ).toBeVisible();
  // CTAs agora são botões (submit) que abrem o Keycloak direto, não mais links
  // para /signup e /login — sem a segunda tela intermediária.
  await expect(
    page.getByRole("button", { name: "Começar grátis 7 dias" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Já tenho conta" })
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

test("/login mostra formulário de login com botão ativo", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("login-keycloak")).toBeVisible();
  await expect(page.getByTestId("login-keycloak")).toBeEnabled();
});
