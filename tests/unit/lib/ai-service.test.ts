import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Testes unitários de callAgendaService (src/lib/ai-service.ts).
 *
 * Verifica:
 * - Lança "AI_SERVICE_BASE_URL/SECRET ausentes" quando BASE está ausente
 * - Lança "AI_SERVICE_BASE_URL/SECRET ausentes" quando SECRET está ausente
 * - Constrói a URL como `${BASE}${path}`, injeta x-agenda-secret e content-type
 * - Repassa method/body do init
 * - Permite sobrescrever headers via init.headers
 */

beforeEach(() => {
  vi.resetModules();
  (global.fetch as unknown) = vi.fn();
});

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

async function load(envOverrides: {
  AI_SERVICE_BASE_URL?: string | undefined;
  AI_SERVICE_SECRET?: string | undefined;
} = {}) {
  vi.doMock("@/lib/env", () => ({
    env: {
      AI_SERVICE_BASE_URL: "https://ai.example.com",
      AI_SERVICE_SECRET: "agenda-secret",
      ...envOverrides,
    },
  }));
  return import("@/lib/ai-service");
}

describe("callAgendaService", () => {
  it("lança quando AI_SERVICE_BASE_URL está ausente", async () => {
    const { callAgendaService } = await load({ AI_SERVICE_BASE_URL: undefined });
    await expect(callAgendaService("/agenda/list")).rejects.toThrow(
      "AI_SERVICE_BASE_URL/SECRET ausentes",
    );
    expect(
      (global.fetch as unknown as ReturnType<typeof vi.fn>),
    ).not.toHaveBeenCalled();
  });

  it("lança quando AI_SERVICE_SECRET está ausente", async () => {
    const { callAgendaService } = await load({ AI_SERVICE_SECRET: undefined });
    await expect(callAgendaService("/agenda/list")).rejects.toThrow(
      "AI_SERVICE_BASE_URL/SECRET ausentes",
    );
    expect(
      (global.fetch as unknown as ReturnType<typeof vi.fn>),
    ).not.toHaveBeenCalled();
  });

  it("happy path: constrói URL, injeta x-agenda-secret, content-type e cache:no-store", async () => {
    const { callAgendaService } = await load();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await callAgendaService("/agenda/list?tenant=t-1");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string>; cache: string },
    ];
    expect(url).toBe("https://ai.example.com/agenda/list?tenant=t-1");
    expect(init.headers["x-agenda-secret"]).toBe("agenda-secret");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(init.cache).toBe("no-store");
  });

  it("repassa method e body do init", async () => {
    const { callAgendaService } = await load();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("{}", { status: 200 }),
    );

    await callAgendaService("/agenda/book", {
      method: "POST",
      body: JSON.stringify({ slot: "2026-06-10T09:00:00Z" }),
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      slot: "2026-06-10T09:00:00Z",
    });
  });

  it("headers de init.headers sobrescrevem os defaults", async () => {
    const { callAgendaService } = await load();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("{}", { status: 200 }),
    );

    await callAgendaService("/agenda/list", {
      headers: { "x-custom": "value" },
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(init.headers["x-custom"]).toBe("value");
    // secret e content-type ainda presentes
    expect(init.headers["x-agenda-secret"]).toBe("agenda-secret");
    expect(init.headers["content-type"]).toBe("application/json");
  });
});
