import { test, expect } from "@playwright/test";

/**
 * Smoke E2E da tela /agenda -- GRADE (Fase 2).
 *
 * A tela foi reescrita de lista para um CalendarGrid semana/dia.
 * Cobre o loop criar->ver->reagendar->cancelar pela grade.
 *
 * HARNESS
 * - Autenticacao: storageState injetado pelo auth.setup.ts (cookie *session-token
 *   gerado via /api/auth/callback/credentials com E2E_AUTH_MOCK=1).
 * - Mocks: page.route para api/agenda/list e rotas de escrita.
 * - Data determinista: usa a semana corrente para garantir que o card
 *   apareca na coluna visivel sem precisar navegar.
 */

// ---------------------------------------------------------------------------
// Helpers de data (mirrors startOfWeek + toLocalInput do app)
// ---------------------------------------------------------------------------

/** Segunda-feira 00:00 da semana que contem d (week starts Monday). */
function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = r.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Adiciona n dias a um Date. */
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** ISO 8601 com offset local explicito (como o app gera). */
function toIsoWithOffset(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const oh = pad(Math.floor(Math.abs(off) / 60));
  const om = pad(Math.abs(off) % 60);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${oh}:${om}`
  );
}

/**
 * Slot fixo na semana corrente: terca-feira da semana atual as 13:00 local.
 * Usando terca (indice 1 a partir de segunda) para cair na semana corrente.
 * Garante que o card apareca na grade sem navegar.
 */
function apptSlot(): { start: Date; end: Date; startIso: string; endIso: string } {
  const monday = startOfWeek(new Date());
  const tuesday = addDays(monday, 1); // terca = segunda + 1 dia
  const start = new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate(), 13, 0, 0);
  const end = new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate(), 14, 0, 0);
  return { start, end, startIso: toIsoWithOffset(start), endIso: toIsoWithOffset(end) };
}

// ---------------------------------------------------------------------------
// Factory de appointment fixture
// ---------------------------------------------------------------------------

function makeAppt(overrides: Partial<{
  id: string; start: string; end: string;
  contactName: string; title: string; status: string; source: string;
}> = {}) {
  const slot = apptSlot();
  return {
    id: "a1",
    start: slot.startIso,
    end: slot.endIso,
    contactName: "Ana",
    title: "corte",
    status: "confirmado",
    source: "manual",
    ...overrides,
  };
}

// The app renders cards with the em-dash label: contactName + " — " + title
const CARD_LABEL = "Ana — corte";

// ===========================================================================
// Testes
// ===========================================================================

test("cria agendamento pela grade e ve o card", async ({ page }) => {
  // Fluxo: clica numa celula-hora -> preenche o AppointmentForm -> submete ->
  // a lista e re-buscada (mock retorna o agendamento criado) -> card aparece.
  let created = false;

  await page.route("**/api/agenda/list**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        appointments: created ? [makeAppt()] : [],
        blocks: [],
      }),
    }),
  );

  await page.route("**/api/agenda/appointments", (route) => {
    if (route.request().method() !== "POST") { route.fallback(); return; }
    created = true;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "a1" }),
    });
  });

  await page.goto("/agenda");

  // Aguarda pelo menos uma celula-hora clicavel aparecer (grade carregada)
  const firstCell = page.getByRole("button", { name: /^Criar em / }).first();
  await expect(firstCell).toBeVisible();

  // Clica na primeira celula disponivel
  await firstCell.click();

  // AppointmentForm deve abrir
  await expect(page.getByRole("form", { name: "Novo agendamento" })).toBeVisible();

  // Preenche os campos (start ja vem preenchido pelo clique na grade)
  await page.getByLabel(/cliente/i).fill("Ana");
  await page.locator("#appt-title").fill("corte");

  // Submete
  await page.getByRole("button", { name: /^Agendar$/ }).click();

  // Apos POST + invalidacao, o card deve aparecer na grade
  await expect(page.getByText(CARD_LABEL)).toBeVisible();
});

// ---------------------------------------------------------------------------

test("card criado abre o painel com acoes Reagendar e Cancelar", async ({ page }) => {
  // Lista ja retorna o agendamento; clica no card; painel abre.
  await page.route("**/api/agenda/list**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ appointments: [makeAppt()], blocks: [] }),
    }),
  );

  await page.goto("/agenda");

  // Aguarda o card aparecer
  await expect(page.getByText(CARD_LABEL)).toBeVisible();

  // Clica no card (button que contem o label)
  await page.getByText(CARD_LABEL).click();

  // Painel deve aparecer (aria-label="Detalhes de <label>")
  const panel = page.getByRole("complementary", { name: new RegExp(`Detalhes de ${CARD_LABEL}`, "i") });
  await expect(panel).toBeVisible();

  // Acoes disponiveis para compromisso nao-cancelado
  await expect(panel.getByRole("button", { name: /^Reagendar$/i })).toBeVisible();
  await expect(panel.getByRole("button", { name: /^Cancelar$/i })).toBeVisible();
  await expect(panel.getByRole("button", { name: /^Fechar$/i })).toBeVisible();
});

// ---------------------------------------------------------------------------

test("reagendar pela grade usa date-picker inline", async ({ page }) => {
  // Fluxo: abre painel -> clica "Reagendar" -> preenche datetime-local inline ->
  // clica "Confirmar" -> API POST reschedule e chamada com newSlotIso.
  // O window.prompt NAO e mais usado; o reschedule e feito pelo AppointmentPanel.
  let rescheduleBody: unknown = null;

  await page.route("**/api/agenda/list**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ appointments: [makeAppt()], blocks: [] }),
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
  await expect(page.getByText(CARD_LABEL)).toBeVisible();

  // Abre o painel
  await page.getByText(CARD_LABEL).click();
  const panel = page.getByRole("complementary", { name: new RegExp(`Detalhes de ${CARD_LABEL}`, "i") });
  await expect(panel).toBeVisible();

  // Clica "Reagendar" -> expoe o inline date-picker (sem window.prompt)
  await panel.getByRole("button", { name: /^Reagendar$/i }).click();

  // Preenche o campo datetime-local com um novo slot (um dia depois do slot atual)
  const slot = apptSlot();
  const next = addDays(slot.start, 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const newSlotLocal = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;

  await page.getByLabel(/nova data e hora/i).fill(newSlotLocal);

  // Clica "Confirmar" -> dispara o POST reschedule
  await page.getByRole("button", { name: /^Confirmar$/i }).click();

  // Aguarda a chamada a API de reschedule com o novo slot ISO
  await expect.poll(() => rescheduleBody, { timeout: 5000 }).toMatchObject({
    newSlotIso: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00[+-]\d{2}:\d{2}$/),
  });
});

// ---------------------------------------------------------------------------

test("cancelar chama a API de cancel e o painel fecha", async ({ page }) => {
  // Fluxo: abre painel -> clica "Cancelar" -> API POST cancel ->
  // painel fecha; card permanece (com line-through para cancelado).
  let cancelRequested = false;

  await page.route("**/api/agenda/list**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        appointments: [makeAppt({ status: cancelRequested ? "cancelado" : "confirmado" })],
        blocks: [],
      }),
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
  await expect(page.getByText(CARD_LABEL)).toBeVisible();

  // Abre o painel
  await page.getByText(CARD_LABEL).click();
  const panel = page.getByRole("complementary", { name: new RegExp(`Detalhes de ${CARD_LABEL}`, "i") });
  await expect(panel).toBeVisible();

  // Clica "Cancelar"
  await panel.getByRole("button", { name: /^Cancelar$/i }).click();

  // Painel fecha apos onSuccess: setSelected(null)
  await expect(panel).not.toBeVisible({ timeout: 5000 });

  // Card continua visivel (line-through CSS via status=cancelado)
  await expect(page.getByText(CARD_LABEL)).toBeVisible();

  // Confirma que a API foi chamada
  expect(cancelRequested).toBe(true);
});

// ---------------------------------------------------------------------------

test("agendar vinculando contato Odoo + online + convite", async ({ page }) => {
  // Fluxo: abre formulario via celula -> digita nome -> escolhe sugestao Odoo ->
  // marca online + convite -> submete -> POST body contem odoo_partner_id, invite,
  // contact_email.

  await page.route("**/api/agenda/contacts/search*", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [{ id: 7, name: "Ana Silva", phone: "11", email: "ana@x.com" }],
      }),
    }),
  );

  let body: Record<string, unknown> | null = null;
  await page.route("**/api/agenda/appointments", async (r) => {
    if (r.request().method() !== "POST") { r.fallback(); return; }
    body = JSON.parse(r.request().postData() ?? "{}") as Record<string, unknown>;
    await r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "a1" }),
    });
  });

  await page.route("**/api/agenda/list**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ appointments: [], blocks: [] }),
    }),
  );

  await page.goto("/agenda");

  // Aguarda grade carregada e abre o formulario de criacao
  const firstCell = page.getByRole("button", { name: /^Criar em / }).first();
  await expect(firstCell).toBeVisible();
  await firstCell.click();

  // AppointmentForm deve abrir
  await expect(page.getByRole("form", { name: "Novo agendamento" })).toBeVisible();

  // Digita o nome do cliente para acionar a busca de contatos Odoo
  await page.getByLabel(/cliente/i).fill("Ana");

  // Escolhe a sugestao retornada pela API de contatos
  await page.getByText("Ana Silva").click();

  // Marca reuniao online e convite ao cliente
  await page.getByLabel(/reuni[aã]o online/i).check();
  await page.getByLabel(/convidar o cliente/i).check();

  // Submete o formulario
  await page.getByRole("button", { name: /^Agendar$/ }).click();

  // Verifica que o POST body contem os campos esperados
  await expect.poll(() => body?.odoo_partner_id, { timeout: 5000 }).toBe(7);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const captured = body as unknown as Record<string, unknown>;
  expect(captured.invite).toBe(true);
  expect(captured.contact_email).toBe("ana@x.com");
});
