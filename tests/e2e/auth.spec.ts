import { test, expect } from "@playwright/test";

test.describe("auth — rotas protegidas e login", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("anônimo em /dashboard é redirecionado pra /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("/login mostra o botão Entrar com S4S", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-keycloak")).toBeVisible();
  });
});
