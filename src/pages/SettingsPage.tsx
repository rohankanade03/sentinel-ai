import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  Clock3,
  Database,
  LockKeyhole,
  PlugZap,
  Route,
  Settings,
  ShieldCheck,
  ToggleLeft,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import type { DashboardSnapshot } from "../types/dashboard";
import { getSlaRuleForUrgency } from "../utils/slaRules";

interface SettingsPageProps {
  snapshot: DashboardSnapshot | null;
  isLoading: boolean;
  error: string | null;
}

const modules = [
  {
    label: "Citizen intake",
    detail: "Complaint form, generated ticket ID, confirmation screen",
    enabled: true,
  },
  {
    label: "Citizen progress",
    detail: "Received to Fixed tracker with masked citizen details",
    enabled: true,
  },
  {
    label: "Admin triage",
    detail: "Complaint queue, filters, urgency, SLA countdown",
    enabled: true,
  },
  {
    label: "Audit trail",
    detail: "Officer action log with status transitions and notes",
    enabled: true,
  },
  {
    label: "Trend spikes",
    detail: "Sector surge detection across 2-hour windows",
    enabled: true,
  },
  {
    label: "Heatmap",
    detail: "Sector markers with urgency colors",
    enabled: true,
  },
];

const guardrails = [
  {
    title: "Authentication boundary",
    description: "JWT-backed login gates the dashboard and role-based modules.",
    status: "Guarded",
  },
  {
    title: "AI boundary",
    description: "AI summaries and classification fields are persisted with each complaint lifecycle event.",
    status: "Guarded",
  },
  {
    title: "Privacy boundary",
    description: "Citizen names and phone numbers are masked before display and API responses.",
    status: "Active",
  },
  {
    title: "Persistence boundary",
    description: "MongoDB is the source of truth for complaints, audit logs, notifications, and analytics.",
    status: "Active",
  },
];

const urgencyLevels = ["CRITICAL", "High", "Medium", "Low"];

export function SettingsPage({ snapshot, isLoading, error }: SettingsPageProps) {
  const moduleCount = modules.filter((module) => module.enabled).length;
  const complaintCount = snapshot?.complaints.length ?? 0;
  const categoryCount = snapshot?.categories.filter((category) => category.value !== "all").length ?? 0;
  const statusCount = snapshot?.statusFilters.filter((status) => status.value !== "all").length ?? 0;
  const generatedAt = useMemo(() => {
    if (!snapshot?.generatedAt) {
      return "Waiting for data";
    }

    return new Date(snapshot.generatedAt).toLocaleString();
  }, [snapshot?.generatedAt]);

  return (
    <div className="grid gap-6">
      <section className="glass-panel shine-sweep animate-rise rounded-2xl p-6 shadow-premium sm:p-8">
        <StatusBadge tone="neutral">
          <Settings size={14} />
          Scope guard
        </StatusBadge>
        <div className="mt-4">
          <div>
            <h1 className="text-4xl font-black leading-tight text-ink sm:text-5xl">
              System settings and implementation boundaries.
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-muted">
              Review enabled modules, API readiness, privacy rules, SLA policy,
              and the integrations intentionally protected behind clear boundaries.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SettingsMetric
          icon={<PlugZap size={18} />}
          label="Enabled modules"
          value={`${moduleCount}/${modules.length}`}
        />
        <SettingsMetric
          icon={<Database size={18} />}
          label="Loaded complaints"
          value={isLoading ? "..." : String(complaintCount)}
        />
        <SettingsMetric
          icon={<Route size={18} />}
          label="Categories"
          value={isLoading ? "..." : String(categoryCount)}
        />
        <SettingsMetric
          icon={<Clock3 size={18} />}
          label="Statuses"
          value={isLoading ? "..." : String(statusCount)}
        />
      </section>

      {error ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          {error}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6">
          <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-teal-50 text-teal-700">
                <ToggleLeft size={20} />
              </span>
              <div>
                <h2 className="text-2xl font-black text-ink">Enabled modules</h2>
                <p className="text-sm font-semibold text-muted">
                  Current product surface available in this build.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {modules.map((module) => (
                <article
                  key={module.label}
                  className="rounded-lg border border-line bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-ink">{module.label}</h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-muted">
                        {module.detail}
                      </p>
                    </div>
                    <StatusBadge tone={module.enabled ? "success" : "neutral"}>
                      {module.enabled ? "On" : "Off"}
                    </StatusBadge>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <ShieldCheck size={20} />
              </span>
              <div>
                <h2 className="text-2xl font-black text-ink">Scope guardrails</h2>
                <p className="text-sm font-semibold text-muted">
                  Boundaries that keep the implementation predictable and integration-ready.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {guardrails.map((guardrail) => (
                <article
                  key={guardrail.title}
                  className="rounded-lg border border-line bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-black text-ink">{guardrail.title}</h3>
                    <StatusBadge tone={guardrail.status === "Active" ? "success" : "info"}>
                      {guardrail.status}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                    {guardrail.description}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <LockKeyhole size={20} />
              </span>
              <div>
                <h2 className="text-xl font-black text-ink">Privacy masking</h2>
                <p className="text-sm font-semibold text-muted">
                  Citizen PII display policy
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm font-semibold text-muted">
              <PolicyRow label="Name format" value="A**** S." />
              <PolicyRow label="Phone format" value="98XXXXXX10" />
              <PolicyRow label="Audit display" value="Masked citizen context" />
              <PolicyRow label="Last data sync" value={generatedAt} />
            </div>
          </section>

          <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-ink">SLA response policy</h2>
            <div className="mt-5 grid gap-3">
              {urgencyLevels.map((urgency) => {
                const rule = getSlaRuleForUrgency(urgency);

                return (
                  <article
                    key={urgency}
                    className="rounded-lg border border-line bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-ink">{rule.label}</strong>
                      <span className="text-xs font-black text-teal-700">
                        {rule.response}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-5 text-muted">
                      {rule.resolution}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-muted">
                      {rule.escalation}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

        </aside>
      </section>
    </div>
  );
}

interface SettingsMetricProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function SettingsMetric({ icon, label, value }: SettingsMetricProps) {
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

interface PolicyRowProps {
  label: string;
  value: string;
}

function PolicyRow({ label, value }: PolicyRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-slate-50 px-3 py-2">
      <span>{label}</span>
      <strong className="text-right text-ink">{value}</strong>
    </div>
  );
}
