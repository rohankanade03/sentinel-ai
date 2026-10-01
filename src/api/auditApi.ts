import type { AuditLogEntry } from "../types/dashboard";
import { fetchJson } from "./backendClient";

export async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  return fetchJson<AuditLogEntry[]>("/api/audit", {
    credentials: "include",
  });
}
