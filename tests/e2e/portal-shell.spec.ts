import { test, expect } from "@playwright/test";

/**
 * Smoke E2E do Portal App Shell (Story 7.12).
 *
 * Usa o mesmo storageState dos outros specs (auth.setup.ts → mock auth).
 *
 * Invariante deste smoke: a navegação acontece DENTRO do shell (sidebar
 * persistente, área central troca, mesma aba) e a moldura da área externa
 * monta. O conteúdo REAL do iframe (Chatwoot/Odoo) só renderiza no HML, com
 * as envs NEXT_PUBLIC_* + o Plano A (imagens respeitando ?embed=s4s +
 * frame-ancestors). Sem essas envs, o EmbeddedFrame degrada pro fallback. Por
 * isso afirmamos "frame OU fallback" — o que importa aqui é que a área montou
 * e a navegação não abriu aba nova.
 */

const FRAME_OR_FALLBACK =
  '[data-testid="embedded-frame"], [data-testid="embedded-frame-fallback"]';

test.describe("Portal App Shell", () => {
  test("sidebar navega entre áreas sem abrir aba nova", async ({ page, context }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("navigation", { name: "Navegação principal" }),
    ).toBeVisible();

    // Atendimento: a navegação é same-tab (Link interno) e monta a moldura.
    const pagesBefore = context.pages().length;
    await page.getByTestId("nav-/atendimento").click();
    await expect(page).toHaveURL(/\/atendimento$/);
    await expect(page.locator(FRAME_OR_FALLBACK).first()).toBeVisible();
    expect(context.pages().length).toBe(pagesBefore); // nenhuma aba nova

    // Funil idem.
    await page.getByTestId("nav-/funil").click();
    await expect(page).toHaveURL(/\/funil$/);
    await expect(page.locator(FRAME_OR_FALLBACK).first()).toBeVisible();

    // Item ativo destacado na sidebar.
    await expect(page.getByTestId("nav-/funil")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByTestId("nav-/atendimento")).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
