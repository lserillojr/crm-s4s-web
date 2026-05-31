import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  (global.fetch as unknown) = vi.fn();
});
afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

async function load(envOverrides: Record<string, unknown> = {}) {
  vi.doMock("@/lib/env", () => ({
    env: {
      N8N_API_BASE_URL: "https://n8n.example/webhook",
      N8N_AI_SERVICE_TOKEN: "test-token",
      ...envOverrides,
    },
  }));
  return import("@/lib/api/ai-service");
}

describe("callAiService", () => {
  it("base ausente → ok:false reason:unconfigured (não chama fetch)", async () => {
    const { callAiService } = await load({ N8N_API_BASE_URL: undefined });
    const res = await callAiService({ path: "/kb/api/v1/get", body: { tenant_id: "t-1" } });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("unconfigured");
    expect(global.fetch as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it("happy path: POST com x-ai-service-token, strip de trailing slash, no-store, retorna data tipada", async () => {
    const { callAiService } = await load();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ value: 42 }), { status: 200 }),
    );
    const res = await callAiService<{ value: number }>({
      path: "/kb/api/v1/get",
      body: { tenant_id: "t-1" },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.value).toBe(42);

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string>; cache: string }];
    expect(url).toBe("https://n8n.example/webhook/kb/api/v1/get");
    expect(init.method).toBe("POST");
    expect(init.headers["x-ai-service-token"]).toBe("test-token");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.cache).toBe("no-store");
    expect(JSON.parse(init.body as string)).toEqual({ tenant_id: "t-1" });
  });

  it("method override (GET sem body)", async () => {
    const { callAiService } = await load();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    await callAiService({ path: "/working-hours/api/v1/get", method: "GET" });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("non-2xx → ok:false reason:http com status", async () => {
    const { callAiService } = await load();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("boom", { status: 502 }),
    );
    const res = await callAiService({ path: "/kb/api/v1/get", body: {} });
    expect(res.ok).toBe(false);
    if (!res.ok && res.reason === "http") {
      expect(res.status).toBe(502);
    } else {
      expect.fail("esperado reason:http");
    }
  });

  it("fetch lança → ok:false reason:network", async () => {
    const { callAiService } = await load();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await callAiService({ path: "/kb/api/v1/get", body: {} });
    expect(res.ok).toBe(false);
    if (!res.ok && res.reason === "network") {
      expect(res.isTimeout).toBe(false);
    } else {
      expect.fail("esperado reason:network");
    }
  });

  it("timeout (TimeoutError) → ok:false reason:network isTimeout:true", async () => {
    const { callAiService } = await load();
    const timeoutErr = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(timeoutErr);
    const res = await callAiService({ path: "/kb/api/v1/get", body: {} });
    expect(res.ok).toBe(false);
    if (!res.ok && res.reason === "network") {
      expect(res.isTimeout).toBe(true);
    } else {
      expect.fail("esperado reason:network");
    }
  });
});
