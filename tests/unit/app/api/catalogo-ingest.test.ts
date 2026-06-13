/**
 * Tests for POST /api/catalogo/ingest — chama o estruturador do crm-s4s-ai
 * (canal x-agenda-secret) e devolve drafts+warnings SEM persistir.
 * Persistência = o MEI clicar "Publicar" (POST /api/catalogo).
 *
 * Mocking strategy (espelha agenda-appointments.test.ts):
 *  - vi.resetModules() + import() dinâmico após setar env, pra o snapshot de
 *    `@/lib/env` (lido no import) enxergar AI_SERVICE_BASE_URL/SECRET.
 *  - vi.mock("@/auth") + onboarding-guard via requireApiTenant.
 *  - global.fetch mockado: caminho texto (callAgendaService usa fetch) E
 *    caminho arquivo (fetch direto multipart).
 *
 * Invariante de isolamento: tenant_id SEMPRE vem da sessão (nunca do body).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/auth/onboarding-guard", () => ({
  getTenantIdByEmail: vi.fn(),
}));

const SESSION = { user: { tenantId: "t-1", name: "Joana" } };

const AI_RESULT = {
  products: [
    {
      key: "corte-feminino",
      title: "Corte Feminino",
      description: "Corte e escova",
      price_brl: 80,
      category: "Cabelo",
      attributes: { duracao: "60min" },
    },
    {
      key: "manicure",
      title: "Manicure",
      description: null,
      price_brl: null, // preço faltando — review obrigatória
      category: null,
      attributes: {},
    },
  ],
  warnings: ["Não consegui identificar o preço de 'Manicure'."],
};

function aiResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function setEnv() {
  process.env.AI_SERVICE_BASE_URL = "https://ai.example.com";
  process.env.AI_SERVICE_SECRET = "test-secret";
}

async function loadRoute() {
  setEnv();
  return import("@/app/api/catalogo/ingest/route");
}

beforeEach(() => {
  vi.resetModules();
  authMock.mockReset();
  (global.fetch as unknown) = vi.fn();
});
afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("POST /api/catalogo/ingest — texto colado", () => {
  function textReq(body: unknown) {
    return new Request("http://x/api/catalogo/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401 sem sessão (tenant não resolvido)", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await loadRoute();
    const res = await POST(textReq({ text: "Corte 80" }) as never);
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("400 quando nem file nem text", async () => {
    authMock.mockResolvedValue(SESSION);
    const { POST } = await loadRoute();
    const res = await POST(textReq({}) as never);
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("200 devolve drafts + warnings do estruturador (caminho texto)", async () => {
    authMock.mockResolvedValue(SESSION);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      aiResponse(AI_RESULT),
    );
    const { POST } = await loadRoute();
    const res = await POST(textReq({ text: "Corte 80\nManicure" }) as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.products).toHaveLength(2);
    expect(body.products[1].price_brl).toBeNull();
    expect(body.warnings).toEqual([
      "Não consegui identificar o preço de 'Manicure'.",
    ]);
  });

  it("chama /catalog/structure com o texto e o tenant_id da sessão (não do body)", async () => {
    authMock.mockResolvedValue(SESSION);
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(aiResponse(AI_RESULT));
    const { POST } = await loadRoute();

    await POST(textReq({ text: "Corte 80", tenant_id: "evil-tenant" }) as never);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/catalog\/structure$/);
    expect((init as RequestInit).method).toBe("POST");
    const sent = JSON.parse((init as RequestInit).body as string);
    expect(sent.content).toBe("Corte 80");
    expect(sent.tenant_id).toBe("t-1");
    expect(sent.tenant_id).not.toBe("evil-tenant");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["x-agenda-secret"]).toBe("test-secret");
  });

  it("502 quando o estruturador responde erro (não-413)", async () => {
    authMock.mockResolvedValue(SESSION);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      aiResponse({ error: "boom" }, 500),
    );
    const { POST } = await loadRoute();
    const res = await POST(textReq({ text: "Corte 80" }) as never);
    expect(res.status).toBe(502);
  });

  it("413 do estruturador vira 200 com warning (graceful)", async () => {
    authMock.mockResolvedValue(SESSION);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      aiResponse({ detail: "too large" }, 413),
    );
    const { POST } = await loadRoute();
    const res = await POST(textReq({ text: "x".repeat(10) }) as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.products).toEqual([]);
    expect(body.warnings.join(" ")).toMatch(/grande|10\s?MB|limite/i);
  });
});

describe("POST /api/catalogo/ingest — upload de arquivo", () => {
  function fileReq(file: File, extra?: Record<string, string>) {
    const fd = new FormData();
    fd.append("file", file);
    if (extra) for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    return new Request("http://x/api/catalogo/ingest", {
      method: "POST",
      body: fd,
    });
  }

  it("200 encaminha o arquivo ao estruturador e devolve drafts + warnings", async () => {
    authMock.mockResolvedValue(SESSION);
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(aiResponse(AI_RESULT));
    const { POST } = await loadRoute();

    const file = new File(["nome;preco\nCorte;80"], "catalogo.csv", {
      type: "text/csv",
    });
    const res = await POST(fileReq(file) as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.products).toHaveLength(2);
    expect(body.warnings).toHaveLength(1);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/catalog\/structure\/file$/);
    expect((init as RequestInit).method).toBe("POST");
    const sentBody = (init as RequestInit).body as FormData;
    expect(sentBody).toBeInstanceOf(FormData);
    expect(sentBody.get("tenant_id")).toBe("t-1");
    const sentFile = sentBody.get("file");
    // cross-realm: instanceof File pode falhar sob undici/jsdom; checamos
    // Blob-like (arrayBuffer) que é o que importa pro upstream.
    expect(sentFile).not.toBeNull();
    expect(typeof (sentFile as Blob).arrayBuffer).toBe("function");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["x-agenda-secret"]).toBe("test-secret");
  });

  it("413 do estruturador (arquivo >10MB) → 200 com warning, sem drafts", async () => {
    authMock.mockResolvedValue(SESSION);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      aiResponse({ detail: "too large" }, 413),
    );
    const { POST } = await loadRoute();
    const file = new File(["x"], "big.pdf", { type: "application/pdf" });
    const res = await POST(fileReq(file) as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.products).toEqual([]);
    expect(body.warnings.join(" ")).toMatch(/grande|10\s?MB|limite/i);
  });

  it("401 sem sessão no caminho de arquivo", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await loadRoute();
    const file = new File(["x"], "catalogo.csv", { type: "text/csv" });
    const res = await POST(fileReq(file) as never);
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("tenant_id da sessão sobrescreve tenant_id malicioso no form (isolamento arquivo)", async () => {
    authMock.mockResolvedValue(SESSION);
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(aiResponse(AI_RESULT));
    const { POST } = await loadRoute();

    const file = new File(["nome;preco\nCorte;80"], "catalogo.csv", {
      type: "text/csv",
    });
    // Passa tenant_id "evil-tenant" como campo extra no form — deve ser ignorado
    const res = await POST(fileReq(file, { tenant_id: "evil-tenant" }) as never);
    expect(res.status).toBe(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    const sentBody = (init as RequestInit).body as FormData;
    expect(sentBody).toBeInstanceOf(FormData);
    // O tenant_id enviado ao upstream deve ser o da sessão, nunca o do form
    expect(sentBody.get("tenant_id")).toBe("t-1");
    expect(sentBody.get("tenant_id")).not.toBe("evil-tenant");
  });
});
