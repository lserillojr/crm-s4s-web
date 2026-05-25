import { test, expect } from "@playwright/test";

/**
 * Smoke E2E do wizard de onboarding (Story 7.2 scaffold).
 *
 * Walkthrough completo: /wizard → 5 steps → /dashboard.
 * Cobre o golden path com dados válidos. Cenários de erro de validação
 * são cobertos pelos unit tests de schema (Vitest).
 */

test("/wizard redireciona pra primeiro step", async ({ page }) => {
  await page.goto("/wizard");
  await expect(page).toHaveURL(/\/wizard\/whatsapp$/);
  await expect(
    page.getByText(/Qual número do WhatsApp você vai usar/i)
  ).toBeVisible();
});

test("walkthrough completo dos 5 steps chega ao submit do Step 5", async ({
  page,
}) => {
  // Limpa storage pra começar fresh
  await page.goto("/");
  await page.evaluate(() => {
    try {
      window.localStorage.removeItem("s4s-wizard-v1");
    } catch {
      // Storage pode falhar em alguns ambientes; ignora
    }
  });

  // Step 1: WhatsApp
  await page.goto("/wizard/whatsapp");
  await page.getByLabel("Número do WhatsApp (com DDD)").fill("(11) 99999-9999");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Step 2: Instagram (skip)
  await expect(page).toHaveURL(/\/wizard\/instagram$/);
  // Connect default = false; só avança
  await page.getByRole("button", { name: "Continuar" }).click();

  // Step 3: Calendar (default = connect São Paulo)
  await expect(page).toHaveURL(/\/wizard\/calendar$/);
  await page.getByRole("button", { name: "Continuar" }).click();

  // Step 4: KB
  await expect(page).toHaveURL(/\/wizard\/kb$/);
  await page.getByLabel("Nome do negócio").fill("Salão Maria");
  await page.getByLabel("O que a IA precisa saber").fill(
    "Salão de beleza no centro de São Paulo, atendo cortes femininos, escova e coloração. Horário seg-sex 9h-19h."
  );
  await page.getByRole("button", { name: "Continuar" }).click();

  // Step 5: Confirm — verifica sumário + aceita termos
  await expect(page).toHaveURL(/\/wizard\/confirm$/);
  await expect(page.getByText("(11) 99999-9999")).toBeVisible();
  await expect(page.getByText("Salão Maria")).toBeVisible();
  await page.getByLabel("Aceito termos").check();
  await page.getByRole("button", { name: "Ativar conta" }).click();

  // Sem n8n configurado/mocado o submit falha graciosamente (mensagem de erro),
  // mas NÃO navega mais direto pro /dashboard (era o comportamento mock antigo).
  await expect(page).not.toHaveURL(/\/dashboard$/, { timeout: 3000 });
});

test("voltar do step 2 para step 1 preserva número digitado", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    try {
      window.localStorage.removeItem("s4s-wizard-v1");
    } catch {
      // ok
    }
  });

  await page.goto("/wizard/whatsapp");
  await page.getByLabel("Número do WhatsApp (com DDD)").fill("(21) 98888-7777");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/wizard\/instagram$/);
  await page.getByRole("button", { name: "Voltar" }).click();

  await expect(page).toHaveURL(/\/wizard\/whatsapp$/);
  await expect(page.getByLabel("Número do WhatsApp (com DDD)")).toHaveValue(
    "(21) 98888-7777"
  );
});

test("progress header mostra 'Etapa N de 5' correto", async ({ page }) => {
  await page.goto("/wizard/calendar");
  await expect(page.getByText("Etapa 3 de 5")).toBeVisible();
  await expect(page.getByText("Agenda", { exact: true })).toBeVisible();
});
