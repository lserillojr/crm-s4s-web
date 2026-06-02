import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const tenantByEmailMock = vi.fn();
vi.mock("@/lib/auth/onboarding-guard", () => ({
  getTenantIdByEmail: (e: string) => tenantByEmailMock(e),
}));

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: () => ({
    set: (n: string, v: string) => cookieJar.set(n, v),
    get: (n: string) => (cookieJar.has(n) ? { value: cookieJar.get(n) } : undefined),
    delete: (n: string) => cookieJar.delete(n),
  }),
}));

vi.mock("@/lib/oauth/google", async (orig) => {
  const actual = await orig<typeof import("@/lib/oauth/google")>();
  return {
    ...actual,
    exchangeCodeForTokens: vi.fn(),
    listCalendars: vi.fn(),
    createTestEvent: vi.fn(),
    deleteEvent: vi.fn(),
  };
});

vi.mock("@/lib/db/gcal-tokens", () => ({
  saveEncryptedToken: vi.fn(),
}));

vi.mock("@/lib/db/pool", () => ({
  getPool: vi.fn(() => ({ query: vi.fn() })),
}));

import { GET } from "@/app/api/oauth/google/callback/route";
import { auth } from "@/auth";
import {
  exchangeCodeForTokens, listCalendars, createTestEvent, deleteEvent,
} from "@/lib/oauth/google";
import { saveEncryptedToken } from "@/lib/db/gcal-tokens";

beforeEach(() => {
  cookieJar.clear();
  vi.clearAllMocks();
  tenantByEmailMock.mockResolvedValue(null);
  process.env.WIZARD_TOKEN_KEY = "test-key";
  process.env.GOOGLE_CLIENT_ID = "cid";
  process.env.GOOGLE_CLIENT_SECRET = "csec";
  process.env.GOOGLE_REDIRECT_URI = "https://app.example.com/api/oauth/google/callback";
});

function req(qs: string) {
  return new Request(`https://app.example.com/api/oauth/google/callback?${qs}`);
}

describe("GET /api/oauth/google/callback", () => {
  it("redireciona com error=invalid_state quando state não bate", async () => {
    cookieJar.set("gcal_oauth_state", "abc");
    cookieJar.set("gcal_oauth_return_to", "/wizard/calendar");
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t-1" } } as never);
    const res = await GET(req("code=c1&state=zzz") as never);
    expect(res.headers.get("location")).toMatch(/\/wizard\/calendar\?error=invalid_state/);
  });

  it("redireciona com error=token_exchange_failed", async () => {
    cookieJar.set("gcal_oauth_state", "abc");
    cookieJar.set("gcal_oauth_return_to", "/wizard/calendar");
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t-1" } } as never);
    vi.mocked(exchangeCodeForTokens).mockRejectedValue(new Error("google_token_error: invalid_grant"));
    const res = await GET(req("code=c1&state=abc") as never);
    expect(res.headers.get("location")).toMatch(/error=token_exchange_failed/);
  });

  it("redireciona com error=no_refresh_token quando Google não devolveu refresh_token", async () => {
    cookieJar.set("gcal_oauth_state", "abc");
    cookieJar.set("gcal_oauth_return_to", "/wizard/calendar");
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t-1" } } as never);
    vi.mocked(exchangeCodeForTokens).mockResolvedValue({ access_token: "at", expires_in: 3600 } as never);
    const res = await GET(req("code=c1&state=abc") as never);
    expect(res.headers.get("location")).toMatch(/error=no_refresh_token/);
  });

  it("happy path: persiste token criptografado e redireciona com connected=1", async () => {
    cookieJar.set("gcal_oauth_state", "abc");
    cookieJar.set("gcal_oauth_return_to", "/wizard/calendar");
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t-1" } } as never);
    vi.mocked(exchangeCodeForTokens).mockResolvedValue({ refresh_token: "rt", access_token: "at", expires_in: 3600 });
    vi.mocked(listCalendars).mockResolvedValue([{ id: "primary", summary: "Maria", primary: true }]);
    vi.mocked(createTestEvent).mockResolvedValue({ eventId: "evt-1" });
    vi.mocked(deleteEvent).mockResolvedValue();

    const res = await GET(req("code=c1&state=abc") as never);

    expect(saveEncryptedToken).toHaveBeenCalledWith(expect.anything(), {
      tenantId: "t-1",
      refreshToken: "rt",
      calendarId: "primary",
      encryptionKey: "test-key",
    });
    expect(res.headers.get("location")).toMatch(/\/wizard\/calendar\?connected=1&calendar_id=primary/);
  });

  it("resolve tenant do banco quando o token vem sem tenantId (pós-provisionamento)", async () => {
    cookieJar.set("gcal_oauth_state", "abc");
    cookieJar.set("gcal_oauth_return_to", "/dashboard");
    vi.mocked(auth).mockResolvedValue({ user: { email: "mei@x.dev" } } as never);
    tenantByEmailMock.mockResolvedValue("t-db");
    vi.mocked(exchangeCodeForTokens).mockResolvedValue({ refresh_token: "rt", access_token: "at", expires_in: 3600 });
    vi.mocked(listCalendars).mockResolvedValue([{ id: "primary", summary: "Maria", primary: true }]);
    vi.mocked(createTestEvent).mockResolvedValue({ eventId: "evt-1" });
    vi.mocked(deleteEvent).mockResolvedValue();

    const res = await GET(req("code=c1&state=abc") as never);

    expect(saveEncryptedToken).toHaveBeenCalledWith(expect.anything(), {
      tenantId: "t-db",
      refreshToken: "rt",
      calendarId: "primary",
      encryptionKey: "test-key",
    });
    expect(res.headers.get("location")).toMatch(/\/dashboard\?connected=1/);
  });

  it("event_create_failed: não persiste token e redireciona com erro", async () => {
    cookieJar.set("gcal_oauth_state", "abc");
    cookieJar.set("gcal_oauth_return_to", "/wizard/calendar");
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t-1" } } as never);
    vi.mocked(exchangeCodeForTokens).mockResolvedValue({ refresh_token: "rt", access_token: "at", expires_in: 3600 });
    vi.mocked(listCalendars).mockResolvedValue([{ id: "primary", summary: "Maria", primary: true }]);
    vi.mocked(createTestEvent).mockRejectedValue(new Error("google_event_create_failed: 403"));

    const res = await GET(req("code=c1&state=abc") as never);

    expect(saveEncryptedToken).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toMatch(/error=event_create_failed/);
  });

  it("returnTo malicioso (protocol-relative //evil.com) cai pro fallback /wizard/calendar", async () => {
    cookieJar.set("gcal_oauth_state", "abc");
    cookieJar.set("gcal_oauth_return_to", "//evil.com/x");
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t-1" } } as never);
    const res = await GET(req("code=c1&state=zzz") as never); // força error=invalid_state pro redirect
    // Deve usar fallback, não o cookie:
    expect(res.headers.get("location")).toMatch(/^https:\/\/app\.example\.com\/wizard\/calendar\?error=invalid_state/);
    expect(res.headers.get("location")).not.toMatch(/evil\.com/);
  });

  it("returnTo malicioso (javascript:alert) cai pro fallback", async () => {
    cookieJar.set("gcal_oauth_state", "abc");
    cookieJar.set("gcal_oauth_return_to", "javascript:alert(1)");
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t-1" } } as never);
    const res = await GET(req("code=c1&state=zzz") as never);
    expect(res.headers.get("location")).not.toMatch(/javascript:/);
  });

  it("WIZARD_TOKEN_KEY ausente: não persiste token e redireciona com error=internal", async () => {
    delete process.env.WIZARD_TOKEN_KEY;
    cookieJar.set("gcal_oauth_state", "abc");
    cookieJar.set("gcal_oauth_return_to", "/wizard/calendar");
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t-1" } } as never);
    vi.mocked(exchangeCodeForTokens).mockResolvedValue({ refresh_token: "rt", access_token: "at", expires_in: 3600 });
    vi.mocked(listCalendars).mockResolvedValue([{ id: "primary", summary: "Maria", primary: true }]);
    vi.mocked(createTestEvent).mockResolvedValue({ eventId: "evt-1" });

    const res = await GET(req("code=c1&state=abc") as never);

    expect(saveEncryptedToken).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toMatch(/error=internal/);
  });
});
