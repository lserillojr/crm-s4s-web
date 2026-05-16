import { NextResponse } from "next/server";

/**
 * GET /api/dashboard/summary
 *
 * MOCK fase 2 — substituir por proxy real ao WF05 (Painel API)
 * quando Auth.js OIDC estiver disponível (Story 7.4 / SP3 Keycloak).
 *
 * Forma do payload já reflete o contrato que o WF05 vai expor:
 * - messagesToday: contagem + tendência vs ontem
 * - leadsNew: contagem + lista dos 3 nomes mais recentes
 * - nextMeeting: pode ser null se MEI não tem agenda nas próximas 24h
 *
 * Mantemos esse endpoint client-side via Tanstack Query pra que,
 * quando o proxy real entrar, só mudemos o body do handler — a UI
 * permanece intacta.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type DashboardSummary = {
  messagesToday: {
    count: number;
    trend: "up" | "down" | "flat";
    vsYesterday: number;
  };
  leadsNew: {
    count: number;
    names: string[];
  };
  nextMeeting: {
    withName: string;
    whenISO: string;
    topic: string;
  } | null;
};

export async function GET() {
  const body: DashboardSummary = {
    messagesToday: { count: 17, trend: "up", vsYesterday: 4 },
    leadsNew: { count: 3, names: ["Maria S.", "João P.", "Ana C."] },
    nextMeeting: {
      withName: "Carla M.",
      whenISO: "2026-05-14T14:00:00-03:00",
      topic: "Corte + escova",
    },
  };
  return NextResponse.json(body);
}
