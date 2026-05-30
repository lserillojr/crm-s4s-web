export type IntegrationLevel = "ok" | "warn" | "error" | "unconnected" | "unavailable";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface GoogleLevelInput {
  gcalRevokedAt: Date | null;
  gcalLastUsedAt: Date | null;
  hasRefreshToken: boolean;
}

export function computeGoogleLevel(input: GoogleLevelInput, now: Date = new Date()): IntegrationLevel {
  if (!input.hasRefreshToken) return "unconnected";
  if (input.gcalRevokedAt !== null) return "error";
  if (input.gcalLastUsedAt === null) return "warn";
  const ageMs = now.getTime() - input.gcalLastUsedAt.getTime();
  if (ageMs < 0 || ageMs < TWENTY_FOUR_HOURS_MS) return "ok";
  return "warn";
}

export interface WhatsAppLevelInput {
  waStatus: string | null;
  instanceName: string | null;
  waLastInboundAt: Date | null;
}

const WA_ERROR_STATES = new Set(["close", "disconnected", "logout"]);
const WA_PENDING_STATES = new Set(["connecting", "awaiting_qr_scan", "pending", "qr_pending"]);
const WA_OK_STATES = new Set(["connected", "open"]);

export function computeWhatsAppLevel(input: WhatsAppLevelInput, now: Date = new Date()): IntegrationLevel {
  if (input.waStatus === null && input.instanceName === null) return "unconnected";
  if (input.waStatus === null) return "warn";
  if (WA_ERROR_STATES.has(input.waStatus)) return "error";
  if (WA_PENDING_STATES.has(input.waStatus)) return "warn";
  if (WA_OK_STATES.has(input.waStatus)) {
    if (input.waLastInboundAt === null) return "warn";
    const ageMs = now.getTime() - input.waLastInboundAt.getTime();
    if (ageMs < 0 || ageMs < TWENTY_FOUR_HOURS_MS) return "ok";
    return "warn";
  }
  return "warn";
}
