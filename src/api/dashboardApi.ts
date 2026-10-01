import type { DashboardSnapshot } from "../types/dashboard";
import { fetchJson } from "./backendClient";

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  return fetchJson<DashboardSnapshot>("/api/dashboard");
}
