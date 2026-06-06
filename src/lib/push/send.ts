import { env } from "@/lib/env";

/** Envio de push via Expo Push Service. Interface fina (sendPush) → trocável por
 *  FCM HTTP v1 cru depois sem tocar chamadores. Devolve tokens mortos p/ poda. */
export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  silent?: boolean;
}

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const BATCH = 100;
const TIMEOUT_MS = 10000;

export async function sendPush(tokens: string[], payload: PushPayload): Promise<{ deadTokens: string[] }> {
  const deadTokens: string[] = [];
  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    const messages = batch.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: payload.silent ? null : "default",
      priority: payload.silent ? "normal" : "high",
    }));
    let tickets: Array<{ status?: string; details?: { error?: string } }> = [];
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
      if (env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${env.EXPO_ACCESS_TOKEN}`;
      const resp = await fetch(EXPO_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(messages),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const json = (await resp.json()) as { data?: unknown };
      tickets = Array.isArray(json?.data) ? (json.data as typeof tickets) : [];
    } catch {
      continue; // batch falhou; não poda nada deste lote
    }
    tickets.forEach((t, idx) => {
      if (t?.status === "error" && t?.details?.error === "DeviceNotRegistered") {
        const token = batch[idx];
        if (token !== undefined) deadTokens.push(token);
      }
    });
  }
  return { deadTokens };
}
