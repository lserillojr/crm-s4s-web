/**
 * Tests for /api/catalogo (GET, POST) and /api/catalogo/[id] (PUT, DELETE).
 *
 * Mocking strategy (matches qr.test.ts):
 *  - vi.hoisted() to create pool query mock before module resolution
 *  - vi.mock("@/lib/db/pool", ...) to return that mock
 *  - vi.mock("@/auth", ...) + vi.mock("@/lib/auth/onboarding-guard", ...) via requireApiTenant
 *
 * Tenant isolation invariant: every successful operation asserts that the SQL
 * call included the tenant_id parameter so that cross-tenant leaks are impossible.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { poolQuery } = vi.hoisted(() => ({ poolQuery: vi.fn() }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/onboarding-guard", () => ({
  getTenantIdByEmail: vi.fn(),
}));
vi.mock("@/lib/db/pool", () => ({ getPool: () => ({ query: poolQuery }) }));

import { auth } from "@/auth";
import { GET, POST } from "@/app/api/catalogo/route";

// [id] route — dynamic import to allow params injection
import { PUT, DELETE } from "@/app/api/catalogo/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  poolQuery.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const SESSION = { user: { tenantId: "t-1", name: "Joana" } };
const PRODUCT_ROW = {
  id: "p-1",
  tenant_id: "t-1",
  key: "corte-cabelo",
  title: "Corte de Cabelo",
  description: "Corte feminino",
  price_brl: "45.00",
  category: "cabelo",
  attributes: {},
  source: "manual",
  is_active: true,
  sort_order: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─────────────────────────────────────────────
// GET /api/catalogo
// ─────────────────────────────────────────────
describe("GET /api/catalogo", () => {
  it("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new Request("http://x/api/catalogo") as never);
    expect(res.status).toBe(401);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("200 devolve lista de produtos do tenant", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    poolQuery.mockResolvedValue({ rows: [PRODUCT_ROW], rowCount: 1 });
    const res = await GET(new Request("http://x/api/catalogo") as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.products).toHaveLength(1);
    expect(body.products[0].id).toBe("p-1");
    expect(body.products[0].priceBrl).toBe(45);
    expect(body.products[0].isActive).toBe(true);
  });

  it("tenant_id é sempre passado na query (isolamento)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    poolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    await GET(new Request("http://x/api/catalogo") as never);
    const [, params] = poolQuery.mock.calls[0]!;
    expect(params).toContain("t-1");
  });

  it("200 lista vazia quando tenant não tem produtos", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    poolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await GET(new Request("http://x/api/catalogo") as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.products).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
// POST /api/catalogo (create)
// ─────────────────────────────────────────────
describe("POST /api/catalogo", () => {
  function postReq(body: unknown) {
    return new Request("http://x/api/catalogo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const validDraft = {
    key: "corte-cabelo",
    title: "Corte de Cabelo",
    description: "Corte feminino",
    priceBrl: 45.0,
    category: "cabelo",
    attributes: {},
  };

  it("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(postReq(validDraft) as never);
    expect(res.status).toBe(401);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("400 body inválido (title ausente)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const res = await POST(postReq({ key: "x" }) as never);
    expect(res.status).toBe(400);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("400 key ausente", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const res = await POST(postReq({ title: "Corte" }) as never);
    expect(res.status).toBe(400);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("201 insere produto e retorna o criado", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    poolQuery.mockResolvedValue({ rows: [PRODUCT_ROW], rowCount: 1 });
    const res = await POST(postReq(validDraft) as never);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.product.id).toBe("p-1");
    expect(body.product.priceBrl).toBe(45);
  });

  it("tenant_id vem da sessão (não do body)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    poolQuery.mockResolvedValue({ rows: [PRODUCT_ROW], rowCount: 1 });
    const bodyWithEvil = { ...validDraft, tenantId: "evil-tenant" };
    await POST(postReq(bodyWithEvil) as never);
    const [, params] = poolQuery.mock.calls[0]!;
    expect(params).toContain("t-1");
    expect(params).not.toContain("evil-tenant");
  });

  it("409 quando key já existe para o tenant (unique violation)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const uniqueErr = Object.assign(new Error("duplicate"), { code: "23505" });
    poolQuery.mockRejectedValue(uniqueErr);
    const res = await POST(postReq(validDraft) as never);
    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────
// PUT /api/catalogo/[id]
// ─────────────────────────────────────────────
describe("PUT /api/catalogo/[id]", () => {
  const params = { params: Promise.resolve({ id: "p-1" }) };

  function putReq(body: unknown) {
    return new Request("http://x/api/catalogo/p-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const validUpdate = { title: "Corte Atualizado", priceBrl: 50.0 };

  it("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PUT(putReq(validUpdate) as never, params as never);
    expect(res.status).toBe(401);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("400 body inválido (campos desconhecidos não causam erro, mas body vazio sim)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const res = await PUT(putReq({}) as never, params as never);
    expect(res.status).toBe(400);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("200 update inclui tenant_id no WHERE (isolamento)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    poolQuery.mockResolvedValue({
      rows: [{ ...PRODUCT_ROW, title: "Corte Atualizado", price_brl: "50.00" }],
      rowCount: 1,
    });
    const res = await PUT(putReq(validUpdate) as never, params as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.product.title).toBe("Corte Atualizado");
    const [sql, sqlParams] = poolQuery.mock.calls[0]!;
    // Must scope by both id AND tenant_id
    expect(String(sql)).toMatch(/tenant_id/i);
    expect(sqlParams).toContain("t-1");
    expect(sqlParams).toContain("p-1");
  });

  it("404 quando produto não existe ou pertence a outro tenant", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    poolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await PUT(putReq(validUpdate) as never, params as never);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// DELETE /api/catalogo/[id] (soft delete)
// ─────────────────────────────────────────────
describe("DELETE /api/catalogo/[id]", () => {
  const params = { params: Promise.resolve({ id: "p-1" }) };

  it("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(
      new Request("http://x/api/catalogo/p-1", { method: "DELETE" }) as never,
      params as never,
    );
    expect(res.status).toBe(401);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("200 soft-delete: sets is_active=false, escopado por tenant_id E id", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    poolQuery.mockResolvedValue({ rows: [{ id: "p-1" }], rowCount: 1 });
    const res = await DELETE(
      new Request("http://x/api/catalogo/p-1", { method: "DELETE" }) as never,
      params as never,
    );
    expect(res.status).toBe(200);
    const [sql, sqlParams] = poolQuery.mock.calls[0]!;
    // Soft-delete: deve setar is_active=false, nunca DELETE FROM
    expect(String(sql)).not.toMatch(/DELETE FROM/i);
    expect(String(sql)).toMatch(/is_active/i);
    expect(String(sql)).toMatch(/false/i);
    // Must scope by tenant_id
    expect(String(sql)).toMatch(/tenant_id/i);
    expect(sqlParams).toContain("t-1");
    expect(sqlParams).toContain("p-1");
  });

  it("404 quando produto não existe ou é de outro tenant", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    poolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await DELETE(
      new Request("http://x/api/catalogo/p-1", { method: "DELETE" }) as never,
      params as never,
    );
    expect(res.status).toBe(404);
  });
});
