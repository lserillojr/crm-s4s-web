import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboardSummary } from "@/lib/dashboard/use-dashboard-summary";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => { (global.fetch as any) = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ greeting: { userName: "João", businessName: "X" },
    weekConversations: 5, conversationsToday: null, leadsNew: null, nextMeeting: null }),
    { status: 200 })); });

describe("useDashboardSummary", () => {
  it("busca /api/dashboard/summary e retorna data", async () => {
    const { result } = renderHook(() => useDashboardSummary(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.greeting.userName).toBe("João");
    expect(global.fetch).toHaveBeenCalledWith("/api/dashboard/summary", expect.anything());
  });
});
