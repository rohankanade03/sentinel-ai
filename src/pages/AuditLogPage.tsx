import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ClipboardList, History, Search, ShieldCheck, UserCheck } from "lucide-react";
import { fetchAuditLog } from "../api/auditApi";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { StatusBadge } from "../components/StatusBadge";
import type { AuditLogEntry, DashboardSnapshot } from "../types/dashboard";

interface AuditLogPageProps {
  snapshot: DashboardSnapshot | null;
  isLoading: boolean;
  variant?: "page" | "embedded";
}

type AuditFilter = "all" | "system" | "officer" | "citizen";

function matchesRole(filter: AuditFilter, entry: AuditLogEntry) {
  if (filter === "all") {
    return true;
  }

  return entry.role.toLowerCase().includes(filter);
}

export function AuditLogPage({
  snapshot: _snapshot,
  isLoading,
  variant = "page",
}: AuditLogPageProps) {
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AuditFilter>("all");

  useEffect(() => {
    let isMounted = true;

    async function loadAuditLog() {
      setIsAuditLoading(true);

      try {
        const entries = await fetchAuditLog();

        if (isMounted) {
          setAuditEntries(entries);
          setAuditError("");
        }
      } catch (error) {
        if (isMounted) {
          setAuditEntries([]);
          setAuditError(
            error instanceof Error
              ? error.message
              : "Audit log could not be loaded from the backend.",
          );
        }
      } finally {
        if (isMounted) {
          setIsAuditLoading(false);
        }
      }
    }

    loadAuditLog();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleEntries = auditEntries.filter((entry) => {
    const searchable = [
      entry.ticketId,
      entry.actorName,
      entry.role,
      entry.action,
      entry.note,
      entry.complaintTitle,
      entry.category,
      entry.sector,
      entry.currentStatus,
      entry.assignedDepartment,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!normalizedQuery || searchable.includes(normalizedQuery)) &&
      matchesRole(filter, entry)
    );
  });
  const officerActions = auditEntries.filter((entry) =>
    entry.role.toLowerCase().includes("officer"),
  ).length;
  const statusChanges = auditEntries.filter((entry) => entry.toStatus).length;
  const isEmbedded = variant === "embedded";

  if (isLoading || isAuditLoading) {
    return (
      <div className="grid gap-4">
        <LoadingSkeleton variant="stat" />
        <LoadingSkeleton variant="complaint" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {isEmbedded ? (
        <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <StatusBadge tone="neutral">
                <History size={14} />
                Audit log
              </StatusBadge>
              <h2 className="mt-3 text-2xl font-black text-ink sm:text-3xl">
                Officer action history
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-muted">
                Ticket updates, notes, status transitions, and department ownership.
              </p>
            </div>
            <div className="rounded-lg border border-line bg-slate-50 px-4 py-3">
              <span className="text-xs font-black uppercase text-teal-700">
                Audit events
              </span>
              <strong className="mt-1 block text-3xl font-black text-ink">
                {auditEntries.length}
              </strong>
            </div>
          </div>
        </section>
      ) : (
        <section className="glass-panel shine-sweep animate-rise rounded-2xl p-6 shadow-premium sm:p-8">
          <StatusBadge tone="neutral">
            <History size={14} />
            Audit log
          </StatusBadge>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <h1 className="text-4xl font-black leading-tight text-ink sm:text-5xl">
                Complete officer action history.
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-muted">
                Tracks ticket updates, officer notes, status transitions, department
                ownership, and citizen-safe complaint context.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-white/75 p-4">
              <span className="text-xs font-black uppercase text-teal-700">
                Total audit events
              </span>
              <strong className="mt-2 block text-4xl font-black text-ink">
                {auditEntries.length}
              </strong>
              <p className="mt-2 text-sm font-semibold text-muted">
                Sorted with the newest action first.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <AuditMetric
          icon={<ClipboardList size={18} />}
          label="Status-linked events"
          value={String(statusChanges)}
        />
        <AuditMetric
          icon={<UserCheck size={18} />}
          label="Officer actions"
          value={String(officerActions)}
        />
        <AuditMetric
          icon={<ShieldCheck size={18} />}
          label="Masked records"
          value="100%"
        />
      </section>

      {auditError ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          {auditError}
        </section>
      ) : null}

      <section className="grid gap-3 rounded-xl border border-line bg-white/90 p-3 shadow-sm md:grid-cols-[minmax(260px,1fr)_auto]">
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-line bg-slate-50 px-4 text-muted">
          <Search size={17} />
          <input
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ticket, officer, action, sector..."
          />
        </label>
        <label className="flex min-h-12 items-center rounded-lg border border-line bg-slate-50 px-4">
          <select
            className="min-w-40 border-0 bg-transparent p-0 text-sm font-semibold text-ink focus:ring-0"
            value={filter}
            onChange={(event) => setFilter(event.target.value as AuditFilter)}
            aria-label="Filter audit role"
          >
            <option value="all">All roles</option>
            <option value="officer">Officer</option>
            <option value="system">System</option>
            <option value="citizen">Citizen</option>
          </select>
        </label>
      </section>

      {visibleEntries.length ? (
        <section className="grid gap-4">
          {visibleEntries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-xl border border-line bg-white p-5 shadow-sm"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="info">{entry.ticketId}</StatusBadge>
                    {entry.toStatus ? (
                      <StatusBadge tone={entry.toStatus === "Resolved" ? "success" : "neutral"}>
                        {entry.fromStatus ? `${entry.fromStatus} -> ` : ""}
                        {entry.toStatus}
                      </StatusBadge>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-xl font-black text-ink">{entry.action}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                    {entry.complaintTitle ?? "Complaint context unavailable"}
                  </p>
                  {entry.note ? (
                    <p className="mt-3 rounded-lg border border-line bg-slate-50 p-3 text-sm leading-6 text-muted">
                      {entry.note}
                    </p>
                  ) : null}
                </div>

                <dl className="grid gap-3 rounded-lg border border-line bg-slate-50 p-4 text-sm">
                  <div>
                    <dt className="font-black uppercase text-slate-400">Actor</dt>
                    <dd className="mt-1 font-bold text-ink">{entry.actorName}</dd>
                  </div>
                  <div>
                    <dt className="font-black uppercase text-slate-400">Role</dt>
                    <dd className="mt-1 font-bold text-ink">{entry.role}</dd>
                  </div>
                  <div>
                    <dt className="font-black uppercase text-slate-400">When</dt>
                    <dd className="mt-1 font-bold text-ink">
                      {new Date(entry.timestamp).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
                <span className="font-semibold text-muted">
                  Category: <strong className="text-ink">{entry.category ?? "Unknown"}</strong>
                </span>
                <span className="font-semibold text-muted">
                  Sector: <strong className="text-ink">{entry.sector ?? "Unknown"}</strong>
                </span>
                <span className="font-semibold text-muted">
                  Department:{" "}
                  <strong className="text-ink">
                    {entry.assignedDepartment ?? "Civic Operations Desk"}
                  </strong>
                </span>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          icon={<History size={24} />}
          title="No audit events found"
          description="Try another ticket, officer, action, sector, or role filter."
        />
      )}
    </div>
  );
}

interface AuditMetricProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function AuditMetric({ icon, label, value }: AuditMetricProps) {
  return (
    <article className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
        {icon}
      </span>
      <strong className="mt-4 block text-3xl font-black text-ink">{value}</strong>
      <p className="mt-1 text-sm font-semibold text-muted">{label}</p>
    </article>
  );
}
