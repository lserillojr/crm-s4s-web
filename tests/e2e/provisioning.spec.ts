import { test, expect } from "@playwright/test";

/**
 * Golden path pós-submit. Intercepta os route handlers internos no browser
 * (page.route) e simula a progressão de status do n8n:
 * provision 202 -> status in_progress -> awaiting_qr_scan (QR) -> success.
 *
 * Pré-req: a auth.setup do projeto já injeta a sessão mock (storageState).
 */
test("submit -> provisioning -> QR -> success", async ({ page }) => {
  // 1x1 PNG transparente como "QR"
  const fakeQr =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  await page.route("**/api/onboarding/provision", (route) =>
    route.fulfill({ status: 202, json: { audit_id: "e2e-audit", status: "in_progress" } }),
  );

  // Progressão por fase, controlada pelo teste (não por contagem de polls): cada
  // fase só avança DEPOIS que a assertion correspondente confirmou que a UI
  // renderizou aquela fase. Isso elimina a corrida em que o polling (poll imediato
  // no mount + intervalo 5s) atravessa in_progress -> qr -> success rápido demais
  // pra assertion de 5s pegar os estados intermediários.
  let phase: "in_progress" | "awaiting_qr_scan" | "success" = "in_progress";
  await page.route("**/api/onboarding/status*", (route) => {
    if (phase === "in_progress") {
      return route.fulfill({
        json: { audit_id: "e2e-audit", status: "in_progress", completed_steps: ["db_insert"] },
      });
    }
    if (phase === "awaiting_qr_scan") {
      return route.fulfill({
        json: { audit_id: "e2e-audit", status: "awaiting_qr_scan", completed_steps: [], qr_code_url: fakeQr },
      });
    }
    return route.fulfill({
      json: { audit_id: "e2e-audit", status: "success", completed_steps: [], tenant_id: "t1", magic_link: "https://m" },
    });
  });

  // state sync não atrapalha o teste
  await page.route("**/api/onboarding/state", (route) =>
    route.fulfill({ json: { state: null } }),
  );

  // Preenche o wizard rápido. Aguarda a navegação entre steps (toHaveURL)
  // antes de clicar de novo — clicar 3x seguidos clica num "Continuar" de uma
  // página em transição/stale e o wizard não avança.
  await page.goto("/wizard/whatsapp");
  await page.getByLabel("Número do WhatsApp (com DDD)").fill("(11) 99999-9999");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/wizard\/instagram$/);
  await page.getByRole("button", { name: "Continuar" }).click(); // instagram

  await expect(page).toHaveURL(/\/wizard\/calendar$/);
  await page.getByRole("button", { name: "Continuar" }).click(); // calendar

  await expect(page).toHaveURL(/\/wizard\/kb$/);
  await page.getByLabel("Nome do negócio").fill("Salão Maria");
  await page
    .getByLabel("O que a IA precisa saber")
    .fill("Salão de beleza no centro de São Paulo, cortes e escova, seg-sex 9h-19h.");
  await page.getByRole("button", { name: "Continuar" }).click(); // kb -> confirm

  await expect(page).toHaveURL(/\/wizard\/confirm$/);
  await page.getByLabel("Aceito termos").check();
  await page.getByRole("button", { name: "Ativar conta" }).click();

  // Provisioning — fase 1: in_progress
  await expect(page).toHaveURL(/\/wizard\/provisioning\?audit_id=e2e-audit/);
  await expect(page.getByText(/Preparando sua conta/i)).toBeVisible();

  // Libera a fase do QR; o próximo poll (intervalo 5s) traz awaiting_qr_scan
  phase = "awaiting_qr_scan";
  await expect(page.getByAltText(/QR Code/i)).toBeVisible({ timeout: 10000 });

  // Libera o success; o próximo poll vira o estado terminal
  phase = "success";
  await expect(page.getByText(/Tudo pronto/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("link", { name: /Ir pro painel/i })).toBeVisible();
});
