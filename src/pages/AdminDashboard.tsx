import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, Flame, LayoutGrid, Map, Search, SlidersHorizontal } from "lucide-react";
import { AdminComplaintCard } from "../components/AdminComplaintCard";
import ComplaintHeatmap from "../components/ComplaintHeatmap";
import CriticalAlert from "../components/CriticalAlert";
import { EmptyState } from "../components/EmptyState";
import { FilterBar } from "../components/FilterBar";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import TrendSpikeAlert from "../components/TrendSpikeAlert";
import type { ComplaintCardModel, DashboardFilters, DashboardSnapshot } from "../types/dashboard";
import { getCategorySignals, getSectorSignals } from "../utils/dashboardAnalytics";
import { normalizeComplaint, normalizeComplaints } from "../utils/complaintAdapters";

interface AdminDashboardProps {
  snapshot: DashboardSnapshot | null;
  isLoading: boolean;
  error: string | null;
}

type SortMode = "newest" | "urgency" | "status";

const fallbackFilters = {
  categories: [{ label: "All categories", value: "all" }],
  statuses: [{ label: "All status", value: "all" as const }],
};

const urgencyRank = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function slugifyCategory(category: string) {
  return category
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function filterComplaints(
  complaints: ComplaintCardModel[],
  filters: DashboardFilters,
  sortMode: SortMode,
) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return [...complaints]
    .filter((complaint) => {
      const searchable = [
        complaint.title,
        complaint.summary,
        complaint.location,
        complaint.category,
        complaint.status,
        complaint.urgency,
        complaint.ticketId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesCategory =
        filters.category === "all" ||
        slugifyCategory(complaint.category) === filters.category;
      const matchesStatus = filters.status === "all" || complaint.status === filters.status;

      return matchesQuery && matchesCategory && matchesStatus;
    })
    .sort((first, second) => {
      if (sortMode === "urgency") {
        return urgencyRank[second.urgency] - urgencyRank[first.urgency];
      }

      if (sortMode === "status") {
        return first.status.localeCompare(second.status);
      }

      return (
        new Date(normalizeComplaint(second).createdAt).getTime() -
        new Date(normalizeComplaint(first).createdAt).getTime()
      );
    });
}

export function AdminDashboard({ snapshot, isLoading, error }: AdminDashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>({
    query: "",
    category: "all",
    status: "all",
  });
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const complaints = snapshot?.complaints ?? [];
  const visibleComplaints = useMemo(
    () => filterComplaints(complaints, filters, sortMode),
    [complaints, filters, sortMode],
  );
  const sectorSignals = useMemo(() => getSectorSignals(complaints).slice(0, 5), [complaints]);
  const categorySignals = useMemo(
    () => getCategorySignals(complaints).slice(0, 4),
    [complaints],
  );
  const criticalCount = useMemo(
    () =>
      normalizeComplaints(complaints).filter(
        (complaint) => complaint.urgencyKey === "CRITICAL",
      ).length,
    [complaints],
  );

  return (
    <div className="grid gap-6">
      <CriticalAlert complaints={complaints} />
      <TrendSpikeAlert complaints={complaints} />

      <section className="glass-panel shine-sweep animate-rise rounded-2xl p-6 shadow-premium sm:p-8">
        <StatusBadge tone="neutral">
          <BarChart3 size={14} />
          Admin dashboard
        </StatusBadge>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <h1 className="text-4xl font-black leading-tight text-ink sm:text-5xl">
              Civic command center for triage teams.
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-muted">
              Manage complaints, spot critical incidents, monitor SLA pressure,
              and inspect sector-level patterns from the existing dataset.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-white/75 p-4">
            <span className="text-xs font-black uppercase text-rose-700">
              Critical queue
            </span>
            <strong className="mt-2 block text-4xl font-black text-ink">
              {criticalCount}
            </strong>
            <p className="mt-2 text-sm font-semibold text-muted">
              Emergency-priority complaints currently in the imported data.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <LoadingSkeleton key={index} variant="stat" />
            ))
          : (snapshot?.stats ?? []).map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-blue-100 text-blue-700">
              <Map size={20} />
            </span>
            <div>
              <h2 className="text-2xl font-black text-ink">Interactive heatmap</h2>
              <p className="text-sm font-semibold text-muted">
                OpenStreetMap layer with urgency-coded sector markers.
              </p>
            </div>
          </div>
          <ComplaintHeatmap complaints={complaints} isLoading={isLoading} />
        </div>

        <div className="grid content-start gap-4">
          <SignalPanel
            title="Sector pressure"
            icon={<Flame size={18} />}
            signals={sectorSignals.map((signal) => ({
              label: signal.sector,
              value: `${signal.open}/${signal.total} open`,
              detail: `${signal.topCategory} dominant`,
              score: signal.pressureScore,
            }))}
          />
          <SignalPanel
            title="Category spikes"
            icon={<BarChart3 size={18} />}
            signals={categorySignals.map((signal) => ({
              label: signal.category,
              value: `${signal.open}/${signal.total} open`,
              detail: `${signal.topSector} hotspot`,
              score: signal.pressureScore,
            }))}
          />
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <StatusBadge tone="neutral">
              <LayoutGrid size={14} />
              Complaint queue
            </StatusBadge>
            <h2 className="mt-3 text-3xl font-black text-ink">
              Complaints management
            </h2>
          </div>
          <label className="inline-flex min-h-12 items-center gap-3 rounded-lg border border-line bg-white px-4 text-muted shadow-sm">
            <SlidersHorizontal size={17} />
            <select
              className="border-0 bg-transparent p-0 text-sm font-semibold text-ink focus:ring-0"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              aria-label="Sort complaints"
            >
              <option value="newest">Newest first</option>
              <option value="urgency">Urgency first</option>
              <option value="status">Status A-Z</option>
            </select>
          </label>
        </div>

        <FilterBar
          filters={filters}
          categories={snapshot?.categories ?? fallbackFilters.categories}
          statuses={snapshot?.statusFilters ?? fallbackFilters.statuses}
          onFiltersChange={setFilters}
        />

        <div className="text-sm font-semibold text-muted">
          {visibleComplaints.length} visible complaints
        </div>

        {error ? (
          <EmptyState
            icon={<Search size={24} />}
            title="Dashboard unavailable"
            description={error}
          />
        ) : isLoading ? (
          <div className="masonry-dashboard columns-1 md:columns-2 2xl:columns-3">
            {Array.from({ length: 8 }, (_, index) => (
              <LoadingSkeleton key={index} variant="complaint" />
            ))}
          </div>
        ) : visibleComplaints.length ? (
          <div className="masonry-dashboard columns-1 md:columns-2 2xl:columns-3">
            {visibleComplaints.map((complaint) => (
              <AdminComplaintCard key={complaint.id} complaint={complaint} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search size={24} />}
            title="No matching complaints"
            description="Try a different category, status, search term, or sort mode."
          />
        )}
      </section>
    </div>
  );
}

interface SignalPanelProps {
  title: string;
  icon: ReactNode;
  signals: Array<{
    label: string;
    value: string;
    detail: string;
    score: number;
  }>;
}

function SignalPanel({ title, icon, signals }: SignalPanelProps) {
  const highestScore = Math.max(...signals.map((signal) => signal.score), 1);

  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-ink">
          {icon}
        </span>
        <h2 className="text-xl font-black text-ink">{title}</h2>
      </div>
      <div className="mt-5 grid gap-4">
        {signals.map((signal) => (
          <div key={signal.label}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <strong className="text-sm text-ink">{signal.label}</strong>
                <p className="text-xs font-semibold text-muted">{signal.detail}</p>
              </div>
              <span className="text-xs font-black text-blue-700">{signal.value}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600"
                style={{ width: `${Math.max(12, (signal.score / highestScore) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
