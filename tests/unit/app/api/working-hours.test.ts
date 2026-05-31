import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { weeklyHoursDefaults } from "@/lib/working-hours/schema";

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

async function loadRoute(
  n8nBaseUrl: string | undefined = "https://n8n.example",
) {
  vi.doMock("@/lib/env", () => ({
    env: {
      N8N_API_BASE_URL: n8nBaseUrl,
      N8N_AI_SERVICE_TOKEN: "test-token",
    },
  }));
  return import("@/app/api/working-hours/route");
}

const VALID_SESSION = { user: { tenantId: "t-1", name: "João" } };

describe("GET /api/working-hours", () => {
  it("401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as any);
    expect(res.status).toBe(401);
  });

  it("proxy: devolve weeklyHours do WF + loaded:true", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ weekly_hours: weeklyHoursDefaults }), {
        status: 200,
      }),
    );
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.loaded).toBe(true);
    expect(body.weeklyHours.monday.open).toBe("09:00");
  });

  it("WF erro → 200 degradado com defaults + loaded:false (form não quebra)", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    (global.fetch as any).mockResolvedValue(
      new Response("boom", { status: 502 }),
    );
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.loaded).toBe(false);
    expect(body.weeklyHours).toEqual(weeklyHoursDefaults);
  });

  it("WF devolve shape inválido → degrada pra defaults + loaded:false", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ weekly_hours: { monday: "lixo" } }), {
        status: 200,
      }),
    );
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://x") as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.loaded).toBe(false);
    expect(body.weeklyHours).toEqual(weeklyHoursDefaults);
  });
});

describe("PUT /api/working-hours", () => {
  function putReq(body: unknown): Request {
    return new Request("http://x", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  it("401 sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const { PUT } = await loadRoute();
    const res = await PUT(putReq(weeklyHoursDefaults) as any);
    expect(res.status).toBe(401);
  });

  it("400 com body inválido (não chama o WF)", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    const { PUT } = await loadRoute();
    const res = await PUT(
      putReq({
        monday: { closed: false, open: "25:00", close: "18:00" },
      }) as any,
    );
    expect(res.status).toBe(400);
    expect(global.fetch as any).not.toHaveBeenCalled();
  });

  it("400 quando dia aberto tem open >= close (superRefine)", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    const bad = {
      ...weeklyHoursDefaults,
      monday: { closed: false, open: "18:00", close: "09:00" },
    };
    const { PUT } = await loadRoute();
    const res = await PUT(putReq(bad) as any);
    expect(res.status).toBe(400);
    expect(global.fetch as any).not.toHaveBeenCalled();
  });

  it("200 ok: persiste no WF e repassa tenant_id + weekly_hours", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const { PUT } = await loadRoute();
    const res = await PUT(putReq(weeklyHoursDefaults) as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/working-hours/api/v1/save");
    expect(init.method).toBe("PUT");
    const sent = JSON.parse(init.body);
    expect(sent.tenant_id).toBe("t-1");
    expect(sent.weekly_hours.monday.open).toBe("09:00");
  });

  it("502 quando o WF falha (save NÃO degrada em silêncio — MEI precisa saber)", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    (global.fetch as any).mockResolvedValue(
      new Response("boom", { status: 500 }),
    );
    const { PUT } = await loadRoute();
    const res = await PUT(putReq(weeklyHoursDefaults) as any);
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.error).toBe("save_failed");
  });

  it("502 quando o WF está unconfigured (base ausente)", async () => {
    authMock.mockResolvedValue(VALID_SESSION);
    vi.doMock("@/lib/env", () => ({
      env: { N8N_API_BASE_URL: undefined, N8N_AI_SERVICE_TOKEN: "test-token" },
    }));
    const { PUT } = await import("@/app/api/working-hours/route");
    const res = await PUT(putReq(weeklyHoursDefaults) as any);
    expect(res.status).toBe(502);
    expect(global.fetch as any).not.toHaveBeenCalled();
  });
});
