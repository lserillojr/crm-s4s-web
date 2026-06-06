import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

beforeEach(() => { vi.resetModules(); (global.fetch as any) = vi.fn(); });
afterEach(() => vi.restoreAllMocks());

async function load(expoToken: string | undefined = undefined) {
  vi.doMock("@/lib/env", () => ({ env: { EXPO_ACCESS_TOKEN: expoToken } }));
  return import("@/lib/push/send");
}
function ticketsResponse(data: unknown[]) {
  return new Response(JSON.stringify({ data }), { status: 200 });
}

describe("sendPush", () => {
  it("POST exp.host com mensagens (to/title/body/data) e devolve deadTokens vazio", async () => {
    (global.fetch as any).mockResolvedValue(ticketsResponse([{ status: "ok" }]));
    const { sendPush } = await load();
    const r = await sendPush(["tok-1"], { title: "T", body: "B", data: { type: "handoff" } });
    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://exp.host/--/api/v2/push/send");
    const sent = JSON.parse(opts.body);
    expect(sent[0]).toMatchObject({ to: "tok-1", title: "T", body: "B", data: { type: "handoff" } });
    expect(r.deadTokens).toEqual([]);
  });

  it("marca DeviceNotRegistered como dead (mesmo índice do batch)", async () => {
    (global.fetch as any).mockResolvedValue(ticketsResponse([
      { status: "ok" },
      { status: "error", details: { error: "DeviceNotRegistered" } },
    ]));
    const { sendPush } = await load();
    const r = await sendPush(["good", "bad"], { title: "T", body: "B" });
    expect(r.deadTokens).toEqual(["bad"]);
  });

  it("silent=true → sound null + priority normal", async () => {
    (global.fetch as any).mockResolvedValue(ticketsResponse([{ status: "ok" }]));
    const { sendPush } = await load();
    await sendPush(["t"], { title: "T", body: "B", silent: true });
    const sent = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(sent[0].sound).toBeNull();
    expect(sent[0].priority).toBe("normal");
  });

  it("inclui Authorization quando EXPO_ACCESS_TOKEN setado", async () => {
    (global.fetch as any).mockResolvedValue(ticketsResponse([{ status: "ok" }]));
    const { sendPush } = await load("exp-secret");
    await sendPush(["t"], { title: "T", body: "B" });
    expect((global.fetch as any).mock.calls[0][1].headers.Authorization).toBe("Bearer exp-secret");
  });

  it("lotes de 100 → 2 requests para 150 tokens", async () => {
    (global.fetch as any).mockResolvedValue(ticketsResponse([{ status: "ok" }]));
    const { sendPush } = await load();
    await sendPush(Array.from({ length: 150 }, (_, i) => `t${i}`), { title: "T", body: "B" });
    expect((global.fetch as any)).toHaveBeenCalledTimes(2);
  });

  it("falha de rede num batch não derruba o retorno (deadTokens vazio)", async () => {
    (global.fetch as any).mockRejectedValue(new Error("network"));
    const { sendPush } = await load();
    const r = await sendPush(["t"], { title: "T", body: "B" });
    expect(r.deadTokens).toEqual([]);
  });
});
