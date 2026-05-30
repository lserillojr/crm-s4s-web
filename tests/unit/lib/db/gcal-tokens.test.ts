import { describe, it, expect, vi } from "vitest";
import { saveEncryptedToken, clearTokenAndRevokedAt, getTenantCalendarInfo } from "@/lib/db/gcal-tokens";

interface MockClient {
  query: ReturnType<typeof vi.fn>;
}

function makeMockClient(rows: unknown[] = []): MockClient {
  return { query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length }) };
}

describe("saveEncryptedToken", () => {
  it("monta UPDATE com pgp_sym_encrypt e parâmetros corretos", async () => {
    const client = makeMockClient();
    await saveEncryptedToken(client as unknown as Parameters<typeof saveEncryptedToken>[0], {
      tenantId: "t-1",
      refreshToken: "rt-xyz",
      calendarId: "primary",
      encryptionKey: "key-abc",
    });
    expect(client.query).toHaveBeenCalledTimes(1);
    const [sql, params] = client.query.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE\s+tenants/i);
    expect(sql).toMatch(/pgp_sym_encrypt/i);
    expect(sql).toMatch(/google_calendar_refresh_token_enc/i);
    expect(sql).toMatch(/google_calendar_id/i);
    expect(sql).toMatch(/gcal_revoked_at\s*=\s*NULL/i);
    expect(sql).toMatch(/WHERE\s+id\s*=\s*\$/i);
    expect(params).toEqual(["rt-xyz", "key-abc", "primary", "t-1"]);
  });
});

describe("clearTokenAndRevokedAt", () => {
  it("limpa coluna criptografada e flag revogado", async () => {
    const client = makeMockClient();
    await clearTokenAndRevokedAt(client as unknown as Parameters<typeof clearTokenAndRevokedAt>[0], "t-1");
    expect(client.query).toHaveBeenCalledTimes(1);
    const [sql, params] = client.query.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE\s+tenants/i);
    expect(sql).toMatch(/google_calendar_refresh_token_enc\s*=\s*NULL/i);
    expect(sql).toMatch(/gcal_revoked_at\s*=\s*NULL/i);
    expect(params).toEqual(["t-1"]);
  });
});

describe("getTenantCalendarInfo", () => {
  it("retorna info do calendário do tenant (sem token)", async () => {
    const client = makeMockClient([
      { google_calendar_id: "primary", has_token: true, gcal_revoked_at: null },
    ]);
    const info = await getTenantCalendarInfo(client as unknown as Parameters<typeof getTenantCalendarInfo>[0], "t-1");
    expect(info).toEqual({
      calendarId: "primary",
      connected: true,
      revoked: false,
    });
    const [sql] = client.query.mock.calls[0]!;
    // Comentário: o SELECT toca refresh_token_enc só pra IS NOT NULL — nunca expõe
    // o conteúdo bytea fora do banco. O estado "connected" segue o token, não o calendar_id.
    expect(sql).toMatch(/google_calendar_refresh_token_enc\s+IS\s+NOT\s+NULL/i);
    expect(sql).toMatch(/AS\s+has_token/i);
    expect(sql).toMatch(/google_calendar_id/);
    expect(sql).not.toMatch(/pgp_sym_decrypt/); // garante que NÃO decripta no app
  });

  it("retorna connected=false quando tenant não tem token", async () => {
    const client = makeMockClient([
      { google_calendar_id: null, has_token: false, gcal_revoked_at: null },
    ]);
    const info = await getTenantCalendarInfo(client as unknown as Parameters<typeof getTenantCalendarInfo>[0], "t-1");
    expect(info.connected).toBe(false);
  });

  it("retorna revoked=true quando flag setado", async () => {
    const client = makeMockClient([
      { google_calendar_id: "primary", has_token: true, gcal_revoked_at: new Date() },
    ]);
    const info = await getTenantCalendarInfo(client as unknown as Parameters<typeof getTenantCalendarInfo>[0], "t-1");
    expect(info.revoked).toBe(true);
  });

  it("retorna defaults quando tenant não existe (rows.length === 0)", async () => {
    const client = makeMockClient([]);
    const info = await getTenantCalendarInfo(client as unknown as Parameters<typeof getTenantCalendarInfo>[0], "t-none");
    expect(info).toEqual({ calendarId: null, connected: false, revoked: false });
  });
});
