import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FollowupInviteCard } from "@/components/followup/invite-card";

function mockGet(enabled: boolean) {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ config: { enabled, intensity: "padrao", followup_enabled: true, noshow_enabled: true, nutricao_enabled: false, respeitar_horario: true, mensagens: null } }), { status: 200 }),
  ) as any;
}

describe("FollowupInviteCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aparece quando desligado", async () => {
    mockGet(false);
    render(<FollowupInviteCard />);
    await waitFor(() => expect(screen.getByTestId("followup-invite")).toBeTruthy());
  });

  it("não aparece quando já ligado", async () => {
    mockGet(true);
    render(<FollowupInviteCard />);
    await waitFor(() => {});
    expect(screen.queryByTestId("followup-invite")).toBeNull();
  });
});
