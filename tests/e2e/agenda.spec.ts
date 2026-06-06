import { test, expect } from "@playwright/test";

/**
 * Smoke E2E da tela /agenda (Onda 1 — só-leitura + Onda 2 — editável).
 *
 * A página consome `useAgenda(from, to)` → `/api/agenda/list`, que VALIDA a
 * resposta contra o contrato Zod. O E2E MOCKA a rota com um payload válido e
 * afirma o caminho feliz: o agendamento aparece na lista, agrupado por dia.
 */

const payload = {
  appointments: [
    {
      id: "a1",
      start: "2026-06-08T13:00:00Z",
      end: "2026-06-08T14:00:00Z",
      contactName: "Ana Cliente",
      status: "confirmado",
      source: "ia",
    },
  ],
  blocks: [
    {
      id: "b1",
      start: "2026-06-08T18:00:00Z",
      end: "2026-06-08T19:00:00Z",
      reason: "Almoço",
    },
  ],
};

const emptyPayload = {
  appointments: [],
  blocks: [],
};

test("/agenda mostra os compromissos vindos da API", async ({ page }) => {
  await page.route("**/api/agenda/list**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  );

  await page.goto("/agenda");

  await expect(page.getByText("Ana Cliente")).toBeVisible();
  await expect(page.getByText("Almoço")).toBeVisible();
  await expect(page.getByText("bloqueio")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Onda 2: ações de escrita
// ---------------------------------------------------------------------------

test("MEI cria e remove um bloqueio", async ({ page }) => {
  // Contador de chamadas à lista — começa com bloqueio, depois sem
  let listCount = 0;
  const payloadComBloqueio = { ...payload };
  const payloadSemBloqueio = { appointments: payload.appointments, blocks: [] };

  await page.route("**/api/agenda/list**", (route) => {
    listCount++;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      // Após a deleção (listCount > 1) devolve sem o bloqueio
      body: JSON.stringify(listCount === 1 ? payloadComBloqueio : payloadSemBloqueio),
    });
  });

  // Mock do POST criar bloqueio → 200
  await page.route("**/api/agenda/blocks", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "b2" }),
      });
    } else if (route.request().method() === "DELETE") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    } else {
      route.fallback();
    }
  });

  await page.goto("/agenda");

  // Agenda carregada com bloqueio existente
  await expect(page.getByText("Almoço")).toBeVisible();

  // -- Cria novo bloqueio --
  await page.getByRole("button", { name: /bloquear horário/i }).click();

  // Formulário aparece
  await expect(
    page.getByRole("form", { name: /formulário de bloqueio/i }),
  ).toBeVisible();

  // Preenche início e fim
  await page.fill("#block-start", "2026-06-10T10:00");
  await page.fill("#block-end", "2026-06-10T11:00");
  await page.fill("#block-reason", "Reunião interna");

  // Submete
  await page.getByRole("button", { name: /^bloquear$/i }).click();

  // Formulário fecha (ou aguarda invalidação da query)
  await expect(
    page.getByRole("form", { name: /formulário de bloqueio/i }),
  ).not.toBeVisible({ timeout: 3000 });

  // -- Remove bloqueio existente "Almoço" --
  // O botão de remover deve estar visível ao lado do bloqueio
  await page.getByRole("button", { name: /remover bloqueio almoço/i }).click();

  // Após invalidação (listCount > 1), bloqueio some
  await expect(page.getByText("Almoço")).not.toBeVisible({ timeout: 3000 });
});

test("MEI cancela um compromisso", async ({ page }) => {
  const payloadCancelado = {
    appointments: [{ ...payload.appointments[0], status: "cancelado" }],
    blocks: [],
  };
  let cancelRequested = false;

  await page.route("**/api/agenda/list**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(cancelRequested ? payloadCancelado : payload),
    }),
  );

  await page.route("**/api/agenda/appointments/a1/cancel", (route) => {
    cancelRequested = true;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/agenda");
  await expect(page.getByText("Ana Cliente")).toBeVisible();

  // Cancela
  await page.getByRole("button", { name: /cancelar compromisso com ana cliente/i }).click();

  // Após invalidação o status muda para "cancelado" e os botões somem
  await expect(
    page.getByRole("button", { name: /cancelar compromisso com ana cliente/i }),
  ).not.toBeVisible({ timeout: 3000 });
});

test("MEI reagenda um compromisso", async ({ page }) => {
  let rescheduleBody: unknown = null;

  await page.route("**/api/agenda/list**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  );

  await page.route("**/api/agenda/appointments/a1/reschedule", async (route) => {
    rescheduleBody = await route.request().postDataJSON();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/agenda");
  await expect(page.getByText("Ana Cliente")).toBeVisible();

  // Abre formulário de reagendar
  await page.getByRole("button", { name: /reagendar compromisso com ana cliente/i }).click();

  // Preenche nova data
  await page.fill('[id^="reschedule-"]', "2026-06-12T15:00");

  // Confirma
  await page.getByRole("button", { name: /confirmar/i }).click();

  // Verifica que a API foi chamada com newSlotIso
  await expect
    .poll(() => rescheduleBody, { timeout: 3000 })
    .toMatchObject({ newSlotIso: expect.stringContaining("2026-06-12T15:00") });
});
