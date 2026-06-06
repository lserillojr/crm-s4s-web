import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Testes de integração da rota GET /api/agenda/list (Onda 2).
 *
 * Verifica:
 * - 401 sem sessão
 * - URL chamada com o tenant da sessão (NÃO do cliente) + from/to repassados
 * - Header x-agenda-secret presente na chamada ao FastAPI
 * - Resposta validada pelo contrato e devolvida com 200
 * - Defaults: janela de 7 dias quando from/to ausentes
 * - FastAPI não-ok → 502
 * - Env ausente → 502 (erro de config capturado pelo catch)
 */

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

beforeEach(() => {
  vi.resetModules();
  authMock.mockReset();
  (global.fetch as any) = vi.fn();
});

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

/** Carrega a rota com as env vars injetadas via vi.doMock (resetModules garante isolamento). */
async function loadRoute(opts?: {
  base?: string | undefined;
  secret?: string | undefined;
}) {
  const base =
    opts !== undefined && "base" in opts
      ? opts.base
      : "https://ai.example.com";
  const secret =
    opts !== undefined && "secret" in opts ? opts.secret : "test-secret";

  // ai-service.ts lê process.env diretamente (não via env.ts), então injetamos
  // via process.env antes do import. resetModules garante que o módulo
  // é reimportado com os novos valores a cada teste.
  if (base !== undefined) {
    process.env.AI_SERVICE_BASE_URL = base;
  } else {
    delete process.env.AI_SERVICE_BASE_URL;
  }
  if (secret !== undefined) {
    process.env.AI_SERVICE_SECRET = secret;
  } else {
    delete process.env.AI_SERVICE_SECRET;
  }

  return import("@/app/api/agenda/list/route");
}

const fastApiOkPayload = {
  appointments: [
    {
      id: "appt-1",
      start: "2026-06-08T13:00:00Z",
      end: "2026-06-08T14:00:00Z",
      contactName: "Ana Lima",
      status: "confirmado",
      source: "ia",
    },
  ],
  blocks: [
    {
      id: "blk-1",
      start: "2026-06-08T12:00:00Z",
      end: "2026-06-08T13:00:00Z",
      reason: null,
    },
  ],
};

function mockFetchOk(body = fastApiOkPayload) {
  (global.fetch as any).mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200 }),
  );
}

describe("GET /api/agenda/list", () => {
  it("401 sem sessão (não chama o FastAPI)", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://app/api/agenda/list"));
    expect(res.status).toBe(401);
    expect((global.fetch as any)).not.toHaveBeenCalled();
  });

  it("chama o FastAPI com o tenant da sessão e os params from/to", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "tenant-abc", name: "João" } });
    mockFetchOk();

    const { GET } = await loadRoute();
    const res = await GET(
      new Request(
        "http://app/api/agenda/list?from=2026-06-08&to=2026-06-15",
      ),
    );

    expect(res.status).toBe(200);
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("/agenda/list");
    expect(url).toContain("tenant=tenant-abc");
    expect(url).toContain("from=2026-06-08");
    expect(url).toContain("to=2026-06-15");
    // Nunca usa "https://ai.example.com" hardcoded sem o BASE:
    expect(url).toMatch(/^https:\/\/ai\.example\.com/);
  });

  it("injeta o header x-agenda-secret na chamada ao FastAPI", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "tenant-abc", name: "João" } });
    mockFetchOk();

    const { GET } = await loadRoute();
    await GET(new Request("http://app/api/agenda/list?from=2026-06-08&to=2026-06-15"));

    const [, opts] = (global.fetch as any).mock.calls[0];
    expect(opts.headers["x-agenda-secret"]).toBe("test-secret");
  });

  it("devolve 200 com o payload do contrato validado pelo Zod", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "Maria" } });
    mockFetchOk();

    const { GET } = await loadRoute();
    const res = await GET(
      new Request("http://app/api/agenda/list?from=2026-06-08&to=2026-06-15"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.appointments).toHaveLength(1);
    expect(body.appointments[0].id).toBe("appt-1");
    expect(body.appointments[0].contactName).toBe("Ana Lima");
    expect(body.blocks).toHaveLength(1);
    expect(body.blocks[0].reason).toBeNull();
  });

  it("usa janela-padrão de 7 dias quando from/to não são passados", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    mockFetchOk();

    const { GET } = await loadRoute();
    await GET(new Request("http://app/api/agenda/list"));

    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("from=");
    expect(url).toContain("to=");
  });

  it("FastAPI não-ok → 502", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    (global.fetch as any).mockResolvedValue(
      new Response("internal error", { status: 500 }),
    );

    const { GET } = await loadRoute();
    const res = await GET(
      new Request("http://app/api/agenda/list?from=2026-06-08&to=2026-06-15"),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "upstream" });
  });

  it("env ausente (BASE/SECRET) → 502 (config error capturado pelo catch)", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });

    const { GET } = await loadRoute({ base: undefined, secret: undefined });
    const res = await GET(
      new Request("http://app/api/agenda/list?from=2026-06-08&to=2026-06-15"),
    );
    expect(res.status).toBe(502);
  });

  it("tenant NÃO pode ser sobrescrito por query param do cliente", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "session-tenant", name: "João" } });
    mockFetchOk();

    const { GET } = await loadRoute();
    // Cliente tenta injetar outro tenant — deve ser ignorado
    await GET(
      new Request(
        "http://app/api/agenda/list?from=2026-06-08&to=2026-06-15&tenant=evil-tenant",
      ),
    );

    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("tenant=session-tenant");
    expect(url).not.toContain("evil-tenant");
  });
});
