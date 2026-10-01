import { fetchDashboardSnapshot } from "../api/dashboardApi";
import type { DashboardSnapshot } from "../types/dashboard";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  return fetchDashboardSnapshot();
}
