import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Testes do route handler POST/DELETE /api/agenda/blocks (Onda 2).
 *
 * Verifica:
 * - 401 sem sessão (POST e DELETE)
 * - POST: corpo inválido → 422
 * - POST: chama FastAPI com tenant da sessão + corpo correto + header secret
 * - POST: FastAPI não-ok → 502
 * - DELETE: id ausente → 400
 * - DELETE: chama FastAPI com tenant e block_id corretos
 * - DELETE: FastAPI não-ok → 502
 * - tenant NÃO pode ser sobrescrito pelo cliente
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

async function loadRoute(opts?: {
  base?: string | undefined;
  secret?: string | undefined;
}) {
  const base =
    opts !== undefined && "base" in opts ? opts.base : "https://ai.example.com";
  const secret =
    opts !== undefined && "secret" in opts ? opts.secret : "test-secret";

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

  return import("@/app/api/agenda/blocks/route");
}

const validBlock = {
  start: "2026-06-10T09:00:00Z",
  end: "2026-06-10T10:00:00Z",
};

const fastApiBlockResponse = {
  id: "blk-new",
  start: "2026-06-10T09:00:00Z",
  end: "2026-06-10T10:00:00Z",
  reason: null,
};

function mockFetchOk(body: unknown = fastApiBlockResponse) {
  (global.fetch as any).mockResolvedValue(
    new Response(JSON.stringify(body), { status: 201 }),
  );
}

function makePostReq(body: unknown) {
  return new Request("http://app/api/agenda/blocks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteReq(id?: string) {
  const url = id
    ? `http://app/api/agenda/blocks?id=${id}`
    : "http://app/api/agenda/blocks";
  return new Request(url, { method: "DELETE" });
}

describe("POST /api/agenda/blocks", () => {
  it("401 sem sessão (não chama o FastAPI)", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await loadRoute();
    const res = await POST(makePostReq(validBlock));
    expect(res.status).toBe(401);
    expect((global.fetch as any)).not.toHaveBeenCalled();
  });

  it("422 com body inválido (start não-datetime)", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    const { POST } = await loadRoute();
    const res = await POST(makePostReq({ start: "não-data", end: "2026-06-10T10:00:00Z" }));
    expect(res.status).toBe(422);
    expect((global.fetch as any)).not.toHaveBeenCalled();
  });

  it("chama FastAPI com tenant da sessão, body correto e header secret", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "tenant-xyz", name: "Maria" } });
    mockFetchOk();

    const { POST } = await loadRoute();
    const res = await POST(makePostReq(validBlock));

    expect(res.status).toBe(201);
    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toMatch(/^https:\/\/ai\.example\.com/);
    expect(url).toContain("/agenda/blocks");
    expect(url).toContain("tenant=tenant-xyz");
    expect(opts.method).toBe("POST");
    expect(opts.headers["x-agenda-secret"]).toBe("test-secret");
    const sentBody = JSON.parse(opts.body);
    expect(sentBody.start).toBe(validBlock.start);
    expect(sentBody.end).toBe(validBlock.end);
  });

  it("reason opcional incluído no body quando fornecido", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    mockFetchOk();

    const { POST } = await loadRoute();
    await POST(makePostReq({ ...validBlock, reason: "Almoço" }));

    const [, opts] = (global.fetch as any).mock.calls[0];
    const sentBody = JSON.parse(opts.body);
    expect(sentBody.reason).toBe("Almoço");
  });

  it("FastAPI não-ok → 502", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    (global.fetch as any).mockResolvedValue(
      new Response("internal error", { status: 500 }),
    );

    const { POST } = await loadRoute();
    const res = await POST(makePostReq(validBlock));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "upstream" });
  });

  it("env ausente → 502", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });

    const { POST } = await loadRoute({ base: undefined, secret: undefined });
    const res = await POST(makePostReq(validBlock));
    expect(res.status).toBe(502);
  });

  it("tenant NÃO pode ser sobrescrito pelo cliente no body", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "session-tenant", name: "João" } });
    mockFetchOk();

    const { POST } = await loadRoute();
    // cliente tenta injetar tenant no body — deve ser ignorado
    await POST(makePostReq({ ...validBlock, tenant: "evil-tenant" }));

    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("tenant=session-tenant");
    expect(url).not.toContain("evil-tenant");
  });
});

describe("DELETE /api/agenda/blocks", () => {
  it("401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { DELETE } = await loadRoute();
    const res = await DELETE(makeDeleteReq("blk-1"));
    expect(res.status).toBe(401);
    expect((global.fetch as any)).not.toHaveBeenCalled();
  });

  it("400 sem id na query string", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    const { DELETE } = await loadRoute();
    const res = await DELETE(makeDeleteReq());
    expect(res.status).toBe(400);
    expect((global.fetch as any)).not.toHaveBeenCalled();
  });

  it("chama FastAPI com block_id e tenant corretos", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "tenant-abc", name: "Maria" } });
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ status: "deleted" }), { status: 200 }),
    );

    const { DELETE } = await loadRoute();
    const res = await DELETE(makeDeleteReq("blk-42"));

    expect(res.status).toBe(200);
    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("/agenda/blocks/blk-42");
    expect(url).toContain("tenant=tenant-abc");
    expect(opts.method).toBe("DELETE");
    expect(opts.headers["x-agenda-secret"]).toBe("test-secret");
  });

  it("FastAPI não-ok → 502", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t-1", name: "João" } });
    (global.fetch as any).mockResolvedValue(
      new Response("not found", { status: 404 }),
    );

    const { DELETE } = await loadRoute();
    const res = await DELETE(makeDeleteReq("blk-99"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "upstream" });
  });
});
