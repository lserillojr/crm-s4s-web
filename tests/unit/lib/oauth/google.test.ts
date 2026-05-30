import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  listCalendars,
  createTestEvent,
  deleteEvent,
  mapGoogleError,
} from "@/lib/oauth/google";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "https://app.example.com/api/oauth/google/callback";
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

describe("buildGoogleAuthUrl", () => {
  it("inclui client_id, scopes default, prompt=consent e access_type=offline", () => {
    const url = new URL(buildGoogleAuthUrl({ state: "abc123" }));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.com/api/oauth/google/callback");
    expect(url.searchParams.get("state")).toBe("abc123");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toContain("calendar.events");
    expect(url.searchParams.get("scope")).toContain("calendar.readonly");
  });

  it("aceita scopes custom", () => {
    const url = new URL(buildGoogleAuthUrl({ state: "x", scopes: ["custom.scope"] }));
    expect(url.searchParams.get("scope")).toBe("custom.scope");
  });
});

describe("exchangeCodeForTokens", () => {
  it("faz POST correto e parse refresh_token", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ refresh_token: "rt-xyz", access_token: "at-abc", expires_in: 3600 }))
    );
    const result = await exchangeCodeForTokens("authcode-1");
    expect(result.refresh_token).toBe("rt-xyz");
    expect(result.access_token).toBe("at-abc");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" })
    );
    const callArgs = fetchSpy.mock.calls[0]![1] as RequestInit;
    const body = new URLSearchParams(callArgs.body as string);
    expect(body.get("code")).toBe("authcode-1");
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("client_id")).toBe("test-client-id");
  });

  it("lança erro se Google retorna error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })
    );
    await expect(exchangeCodeForTokens("bad-code")).rejects.toThrow(/invalid_grant/);
  });
});

describe("listCalendars", () => {
  it("retorna calendars ordenados com primary primeiro", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        items: [
          { id: "secondary@calendar", summary: "Trabalho" },
          { id: "primary", summary: "Maria", primary: true },
          { id: "another@calendar", summary: "Família" },
        ],
      }))
    );
    const cals = await listCalendars("at-abc");
    expect(cals[0]!.primary).toBe(true);
    expect(cals[0]!.id).toBe("primary");
    expect(cals).toHaveLength(3);
  });
});

describe("createTestEvent / deleteEvent", () => {
  it("createTestEvent cria evento e retorna id", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "evt-123" }))
    );
    const result = await createTestEvent("at-abc", "primary");
    expect(result.eventId).toBe("evt-123");
  });

  it("deleteEvent faz DELETE no path correto", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await deleteEvent("at-abc", "primary", "evt-123");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/evt-123",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("mapGoogleError", () => {
  it("mapeia códigos pra mensagens BR", () => {
    expect(mapGoogleError("invalid_state")).toMatch(/sessão|estado/i);
    expect(mapGoogleError("no_refresh_token")).toMatch(/revoga|tentar/i);
    expect(mapGoogleError("token_exchange_failed")).toMatch(/Google/);
    expect(mapGoogleError("insufficient_scope")).toMatch(/permiss/i);
    expect(mapGoogleError("event_create_failed")).toMatch(/evento|teste/i);
    expect(mapGoogleError("list_calendars_failed")).toMatch(/listar|calendário/i);
    expect(mapGoogleError("unknown_error_code")).toBeTruthy(); // fallback genérico
  });
});
