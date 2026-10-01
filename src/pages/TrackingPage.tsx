import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock3, FileSearch, History, Link2, MessageCircle, Phone, Search, ShieldCheck, Siren } from "lucide-react";
import { fetchTracking } from "../api/ticketApi";
import { CitizenFixedTracker } from "../components/CitizenFixedTracker";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { StatusBadge } from "../components/StatusBadge";
import type { CommunicationLogEntry, TrackingPayload } from "../types/dashboard";

function getTicketFromPath() {
  const match = window.location.pathname.match(/^\/track\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function formatRemaining(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return "SLA pending";
  if (seconds <= 0) return "SLA due";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function communicationIcon(type: CommunicationLogEntry["type"]) {
  if (type === "voice_call") return <Phone size={16} />;
  if (type === "officer_alert") return <Siren size={16} />;
  if (type === "tracking_link") return <Link2 size={16} />;
  return <MessageCircle size={16} />;
}

export function TrackingPage() {
  const initialTicket = useMemo(getTicketFromPath, []);
  const [ticketId, setTicketId] = useState(initialTicket);
  const [tracking, setTracking] = useState<TrackingPayload | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "not-found">(
    initialTicket ? "loading" : "idle",
  );
  const [error, setError] = useState("");

  async function loadTracking(nextTicketId: string) {
    const normalizedTicket = nextTicketId.trim();
    if (!normalizedTicket) return;

    setState("loading");
    setTracking(null);
    setError("");

    try {
      setTracking(await fetchTracking(normalizedTicket));
      setState("idle");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Tracking could not be loaded.");
      setState("not-found");
    }
  }

  useEffect(() => {
    if (initialTicket) {
      loadTracking(initialTicket);
    }
  }, [initialTicket]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTicket = ticketId.trim();
    if (!normalizedTicket) return;
    window.history.replaceState(null, "", `/track/${encodeURIComponent(normalizedTicket)}`);
    loadTracking(normalizedTicket);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.12),_transparent_32rem),linear-gradient(180deg,_#f8fafc,_#eef4f7)] px-4 py-6 text-ink sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="glass-panel shine-sweep animate-rise rounded-2xl p-6 shadow-premium sm:p-8">
          <StatusBadge tone="neutral">
            <ShieldCheck size={14} />
            CivicFlow tracking
          </StatusBadge>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h1 className="text-4xl font-black leading-tight text-ink sm:text-5xl">
                Live complaint tracking
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-muted">
                Track status, SLA countdown, officer actions, escalation state, and
                communication confirmations from the official complaint record.
              </p>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row lg:flex-col" onSubmit={handleSubmit}>
              <input
                className="min-h-12 flex-1 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink outline-none transition focus:border-blue-500"
                value={ticketId}
                onChange={(event) => setTicketId(event.target.value)}
                placeholder="CF-2041"
              />
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-black text-white transition hover:-translate-y-0.5"
                type="submit"
              >
                <Search size={18} />
                Track
              </button>
            </form>
          </div>
        </section>

        {state === "loading" ? <LoadingSkeleton variant="complaint" /> : null}

        {tracking ? (
          <section className="grid gap-6 rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase text-muted">
                  {tracking.ticketId}
                </span>
                <h2 className="mt-1 text-3xl font-black text-ink">{tracking.title}</h2>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-muted">
                  {tracking.summary}
                </p>
              </div>
              <StatusBadge tone={tracking.status === "Resolved" ? "success" : "info"}>
                {tracking.status === "Resolved" ? "Fixed" : tracking.status}
              </StatusBadge>
            </div>

            <CitizenFixedTracker steps={tracking.tracker} />

            <dl className="grid gap-3 rounded-lg border border-line bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <dt className="font-black uppercase text-slate-400">Category</dt>
                <dd className="mt-1 font-bold text-ink">{tracking.category}</dd>
              </div>
              <div>
                <dt className="font-black uppercase text-slate-400">Priority</dt>
                <dd className="mt-1 font-bold text-ink">{tracking.priority || "Medium"}</dd>
              </div>
              <div>
                <dt className="font-black uppercase text-slate-400">Department</dt>
                <dd className="mt-1 font-bold text-ink">{tracking.assignedDepartment}</dd>
              </div>
              <div>
                <dt className="font-black uppercase text-slate-400">SLA</dt>
                <dd className="mt-1 font-bold text-ink">{tracking.sla?.label || "Pending"}</dd>
              </div>
              <div>
                <dt className="font-black uppercase text-slate-400">Countdown</dt>
                <dd className="mt-1 font-bold text-ink">
                  {formatRemaining(tracking.sla?.remainingSeconds)}
                </dd>
              </div>
            </dl>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <History size={18} className="text-teal-700" />
                  <h3 className="text-xl font-black text-ink">Officer timeline</h3>
                </div>
                <div className="grid gap-3">
                  {tracking.auditTrail.map((entry) => (
                    <article key={entry.id} className="rounded-lg border border-line bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <strong className="text-sm text-ink">{entry.action}</strong>
                        <span className="text-xs font-semibold text-muted">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-muted">
                        {entry.actorName} ({entry.role})
                        {entry.toStatus ? ` moved status to ${entry.toStatus}` : ""}
                      </p>
                      {entry.note ? <p className="mt-2 text-sm leading-6 text-muted">{entry.note}</p> : null}
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Clock3 size={18} className="text-blue-700" />
                  <h3 className="text-xl font-black text-ink">Communication history</h3>
                </div>
                <div className="grid gap-3">
                  {(tracking.communications || []).map((entry) => (
                    <article key={entry._id || entry.id || `${entry.type}-${entry.createdAt}`} className="rounded-lg border border-line bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-sm font-black capitalize text-ink">
                          {communicationIcon(entry.type)}
                          {entry.type.replace("_", " ")}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase text-muted ring-1 ring-line">
                          {entry.status.replace("-", " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-muted">
                        {new Date(entry.createdAt).toLocaleString()}
                        {entry.attempts ? ` · attempt ${entry.attempts}` : ""}
                      </p>
                      {entry.lastError ? (
                        <p className="mt-2 text-xs font-semibold text-rose-700">{entry.lastError}</p>
                      ) : null}
                    </article>
                  ))}
                  {!tracking.communications?.length ? (
                    <div className="rounded-lg border border-dashed border-line bg-white p-4 text-sm font-semibold text-muted">
                      Communication activity will appear here after registration.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </section>
        ) : null}

        {state === "not-found" ? (
          <EmptyState
            icon={<FileSearch size={24} />}
            title="Ticket not found"
            description={error || "No tracking record exists for this ticket."}
          />
        ) : null}
      </div>
    </main>
  );
}
