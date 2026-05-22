import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const redirectMock = vi.fn(() => {
  throw new Error("REDIRECT");
});

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirectMock(u) }));

describe("requireSession", () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
  });

  it("retorna a sessão quando autenticado", async () => {
    authMock.mockResolvedValue({ user: { tenantId: "t", role: "owner" } });
    const { requireSession } = await import("@/lib/session");
    const s = await requireSession();
    expect(s.user.tenantId).toBe("t");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redireciona pra /login quando anônimo", async () => {
    authMock.mockResolvedValue(null);
    const { requireSession } = await import("@/lib/session");
    await expect(requireSession()).rejects.toThrow("REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
