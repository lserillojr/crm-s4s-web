import { test, expect } from "@playwright/test";

/**
 * Smoke E2E /settings/integracoes (Story 7.7).
 *
 * O storageState do mock auth.setup.ts deixa o tenant_id em "11111111-...". A
 * page lê health via Postgres real (DATABASE_URL stub em dev). Os asserts são
 * sobre presença de elementos, não sobre nível específico — o seed pode variar.
 */

test.describe("/settings/integracoes", () => {
  test("renderiza 3 cards (Google/WhatsApp/Instagram) + link nav", async ({ page }) => {
    await page.goto("/settings/integracoes");

    // Link no header
    await expect(page.getByRole("link", { name: /Integrações/i }).first()).toBeVisible();

    // 3 cards
    await expect(page.getByTestId("google-calendar-card")).toBeVisible();
    await expect(page.getByTestId("whatsapp-card")).toBeVisible();
    await expect(page.getByTestId("instagram-card")).toBeVisible();
  });

  test("InstagramCard é read-only (sem button nem link)", async ({ page }) => {
    await page.goto("/settings/integracoes");
    const card = page.getByTestId("instagram-card");
    await expect(card.getByText(/Disponível na fase 2/)).toBeVisible();
    await expect(card.getByRole("button")).toHaveCount(0);
    await expect(card.getByRole("link")).toHaveCount(0);
  });

  test("Google: sempre tem um link Conectar|Reconectar apontando pra /api/oauth/google/start", async ({
    page,
  }) => {
    await page.goto("/settings/integracoes");
    const link = page.getByRole("link", { name: /Conectar|Reconectar/ }).first();
    await expect(link).toHaveAttribute(
      "href",
      /\/api\/oauth\/google\/start\?returnTo=\/settings\/integracoes/
    );
  });
});
