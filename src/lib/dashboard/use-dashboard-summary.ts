"use client";
import { useQuery } from "@tanstack/react-query";
import type { DashboardSummary } from "@/app/api/dashboard/summary/route";

async function fetchSummary(): Promise<DashboardSummary> {
  const res = await fetch("/api/dashboard/summary", { cache: "no-store" });
  if (!res.ok) throw new Error(`dashboard summary ${res.status}`);
  return res.json();
}

export function useDashboardSummary() {
  return useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchSummary });
}
