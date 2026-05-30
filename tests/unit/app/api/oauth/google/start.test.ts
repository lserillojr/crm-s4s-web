import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted garante que cookieJar existe antes do hoist dos vi.mock factories
const { cookieJar } = vi.hoisted(() => {
  const cookieJar = new Map<string, string>();
  return { cookieJar };
});

// Mock auth() do NextAuth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
// Mock cookies()
vi.mock("next/headers", () => ({
  cookies: () => ({
    set: (name: string, value: string) => cookieJar.set(name, value),
    get: (name: string) => ({ value: cookieJar.get(name) }),
  }),
}));

import { GET } from "@/app/api/oauth/google/start/route";
import { auth } from "@/auth";

beforeEach(() => {
  cookieJar.clear();
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_REDIRECT_URI = "https://app.example.com/api/oauth/google/callback";
  vi.mocked(auth).mockReset();
});

describe("GET /api/oauth/google/start", () => {
  it("redireciona pro login se não há sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const req = new Request("https://app.example.com/api/oauth/google/start");
    const res = await GET(req as never);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toMatch(/\/login/);
  });

  it("seta cookie state e redireciona pra accounts.google.com", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t-1" } } as never);
    const req = new Request("https://app.example.com/api/oauth/google/start");
    const res = await GET(req as never);
    expect(res.headers.get("location")).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/);
    expect(cookieJar.get("gcal_oauth_state")).toMatch(/^[a-f0-9]{64}$/);
    expect(cookieJar.get("gcal_oauth_return_to")).toBe("/wizard/calendar");
  });

  it("respeita returnTo query param", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { tenantId: "t-1" } } as never);
    const req = new Request("https://app.example.com/api/oauth/google/start?returnTo=/integracoes");
    await GET(req as never);
    expect(cookieJar.get("gcal_oauth_return_to")).toBe("/integracoes");
  });
});
