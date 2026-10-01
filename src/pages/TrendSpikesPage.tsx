import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, Clock3, Flame, Search, TrendingUp } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { StatusBadge } from "../components/StatusBadge";
import TrendSpikeAlert from "../components/TrendSpikeAlert";
import type { DashboardSnapshot } from "../types/dashboard";
import { getCategorySignals, getSectorSignals } from "../utils/dashboardAnalytics";
import { getTrendSpikeSignals } from "../utils/trendSpikes";

interface TrendSpikesPageProps {
  snapshot: DashboardSnapshot | null;
  isLoading: boolean;
}

type SpikeFilter = "all" | "critical" | "high-risk";

export function TrendSpikesPage({ snapshot, isLoading }: TrendSpikesPageProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SpikeFilter>("all");
  const complaints = snapshot?.complaints ?? [];
  const spikes = useMemo(() => getTrendSpikeSignals(complaints), [complaints]);
  const sectorSignals = useMemo(() => getSectorSignals(complaints).slice(0, 6), [complaints]);
  const categorySignals = useMemo(
    () => getCategorySignals(complaints).slice(0, 5),
    [complaints],
  );
  const highestRisk = Math.max(...spikes.map((spike) => spike.riskScore), 1);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSpikes = spikes.filter((spike) => {
    const searchable = [
      spike.sector,
      spike.category,
      spike.timeframe,
      ...spike.complaints.map((complaint) => complaint.title),
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    const matchesFilter =
      filter === "all" ||
      (filter === "critical" && spike.criticalCount > 0) ||
      (filter === "high-risk" && spike.riskScore >= 14);

    return matchesQuery && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <LoadingSkeleton variant="stat" />
        <LoadingSkeleton variant="complaint" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <TrendSpikeAlert complaints={complaints} />

      <section className="glass-panel shine-sweep animate-rise rounded-2xl p-6 shadow-premium sm:p-8">
        <StatusBadge tone="neutral">
          <TrendingUp size={14} />
          Trend spikes
        </StatusBadge>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <h1 className="text-4xl font-black leading-tight text-ink sm:text-5xl">
              Surge radar for sector-level complaint spikes.
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-muted">
              Detects 3 or more complaints in the same sector within a 2-hour
              window and ranks them by urgency pressure.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-white/75 p-4">
            <span className="text-xs font-black uppercase text-amber-700">
              Active spike windows
            </span>
            <strong className="mt-2 block text-4xl font-black text-ink">
              {spikes.length}
            </strong>
            <p className="mt-2 text-sm font-semibold text-muted">
              Based on current complaint timestamps and sector grouping.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={<AlertTriangle size={18} />}
          label="Critical spikes"
          value={String(spikes.filter((spike) => spike.criticalCount > 0).length)}
          tone="rose"
        />
        <MetricCard
          icon={<Flame size={18} />}
          label="Highest risk score"
          value={String(highestRisk)}
          tone="amber"
        />
        <MetricCard
          icon={<Clock3 size={18} />}
          label="Window rule"
          value="2h"
          tone="teal"
        />
      </section>

      <section className="grid gap-3 rounded-xl border border-line bg-white/90 p-3 shadow-sm md:grid-cols-[minmax(260px,1fr)_auto]">
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-line bg-slate-50 px-4 text-muted">
          <Search size={17} />
          <input
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sector, category, ticket..."
          />
        </label>
        <label className="flex min-h-12 items-center rounded-lg border border-line bg-slate-50 px-4">
          <select
            className="min-w-40 border-0 bg-transparent p-0 text-sm font-semibold text-ink focus:ring-0"
            value={filter}
            onChange={(event) => setFilter(event.target.value as SpikeFilter)}
            aria-label="Filter trend spikes"
          >
            <option value="all">All spikes</option>
            <option value="critical">Critical involved</option>
            <option value="high-risk">High risk score</option>
          </select>
        </label>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          {visibleSpikes.length ? (
            visibleSpikes.map((spike) => (
              <article
                key={spike.id}
                className="rounded-xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <StatusBadge tone={spike.criticalCount ? "critical" : "high"}>
                      {spike.count}+ reports
                    </StatusBadge>
                    <h2 className="mt-3 text-2xl font-black text-ink">
                      {spike.sector} surge in {spike.category}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-muted">
                      {spike.timeframe} · {spike.criticalCount} critical ·{" "}
                      {spike.highCount} high urgency
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-slate-50 px-4 py-3 text-right">
                    <span className="text-xs font-black uppercase text-slate-400">
                      Risk score
                    </span>
                    <strong className="block text-2xl font-black text-ink">
                      {spike.riskScore}
                    </strong>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600"
                    style={{
                      width: `${Math.max(14, (spike.riskScore / highestRisk) * 100)}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid gap-3">
                  {spike.complaints.map((complaint) => (
                    <div
                      key={complaint.id}
                      className="rounded-lg border border-line bg-slate-50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-sm text-ink">{complaint.ticketId}</strong>
                        <span className="text-xs font-bold text-muted">
                          {complaint.urgencyKey}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-6 text-muted">
                        {complaint.title}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              icon={<Activity size={24} />}
              title="No trend spikes found"
              description="No sector currently has 3 or more matching complaints within a 2-hour window for this filter."
            />
          )}
        </div>

        <aside className="grid content-start gap-4">
          <SignalList
            title="Sector pressure"
            items={sectorSignals.map((signal) => ({
              label: signal.sector,
              value: `${signal.open}/${signal.total} open`,
              detail: `${signal.topCategory} dominant`,
              score: signal.pressureScore,
            }))}
          />
          <SignalList
            title="Category pressure"
            items={categorySignals.map((signal) => ({
              label: signal.category,
              value: `${signal.open}/${signal.total} open`,
              detail: `${signal.topSector} hotspot`,
              score: signal.pressureScore,
            }))}
          />
        </aside>
      </section>
    </div>
  );
}

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "teal" | "amber" | "rose";
}

function MetricCard({ icon, label, value, tone }: MetricCardProps) {
  const toneClass = {
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <article className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <span className={`inline-flex size-10 items-center justify-center rounded-lg ${toneClass[tone]}`}>
        {icon}
      </span>
      <strong className="mt-4 block text-3xl font-black text-ink">{value}</strong>
      <p className="mt-1 text-sm font-semibold text-muted">{label}</p>
    </article>
  );
}

interface SignalListProps {
  title: string;
  items: Array<{
    label: string;
    value: string;
    detail: string;
    score: number;
  }>;
}

function SignalList({ title, items }: SignalListProps) {
  const highestScore = Math.max(...items.map((item) => item.score), 1);

  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <div className="mt-5 grid gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <strong className="text-sm text-ink">{item.label}</strong>
                <p className="text-xs font-semibold text-muted">{item.detail}</p>
              </div>
              <span className="text-xs font-black text-blue-700">{item.value}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600"
                style={{ width: `${Math.max(12, (item.score / highestScore) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
