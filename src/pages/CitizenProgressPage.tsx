import { FormEvent, useState } from "react";
import { FileSearch, History, Search, ShieldCheck } from "lucide-react";
import { fetchCitizenProgress } from "../api/ticketApi";
import { CitizenFixedTracker } from "../components/CitizenFixedTracker";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { StatusBadge } from "../components/StatusBadge";
import type { CitizenProgressPayload, DashboardSnapshot } from "../types/dashboard";

interface CitizenProgressPageProps {
  snapshot: DashboardSnapshot | null;
  isLoading: boolean;
}

export function CitizenProgressPage({
  snapshot: _snapshot,
  isLoading,
}: CitizenProgressPageProps) {
  const [ticketId, setTicketId] = useState("");
  const [searchedTicket, setSearchedTicket] = useState("");
  const [progress, setProgress] = useState<CitizenProgressPayload | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "not-found">(
    "idle",
  );
  const [lookupError, setLookupError] = useState("");

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTicket = ticketId.trim();

    if (!normalizedTicket) {
      return;
    }

    setSearchedTicket(normalizedTicket);
    setLookupState("loading");
    setProgress(null);
    setLookupError("");

    try {
      setProgress(await fetchCitizenProgress(normalizedTicket));
      setLookupState("idle");
    } catch (error) {
      setLookupError(
        error instanceof Error ? error.message : "Ticket progress could not be loaded.",
      );
      setLookupState("not-found");
    }
  }

  return (
    <div className="grid gap-6">
      <section className="glass-panel shine-sweep animate-rise rounded-2xl p-6 shadow-premium sm:p-8">
        <StatusBadge tone="neutral">
          <ShieldCheck size={14} />
          Citizen progress
        </StatusBadge>
        <h1 className="mt-4 text-4xl font-black leading-tight text-ink sm:text-5xl">
          Track a complaint from received to fixed.
        </h1>
        <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-muted">
          Citizens can check ticket status, department assignment, masked identity
          details, and officer action history without exposing private data.
        </p>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-blue-100 text-blue-700">
            <FileSearch size={20} />
          </span>
          <div>
            <h2 className="text-2xl font-black text-ink">Ticket progress lookup</h2>
            <p className="text-sm font-semibold text-muted">
              Try an existing ticket such as SEN-2026-0001.
            </p>
          </div>
        </div>

        <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={handleLookup}>
          <input
            className="min-h-12 flex-1 rounded-lg border border-line bg-slate-50 px-4 text-sm font-semibold text-ink outline-none transition focus:border-blue-500 focus:bg-white"
            value={ticketId}
            onChange={(event) => setTicketId(event.target.value)}
            placeholder="SEN-2026-0001"
          />
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-black text-white transition hover:-translate-y-0.5"
            type="submit"
          >
            <Search size={18} />
            Track ticket
          </button>
        </form>
      </section>

      {isLoading || lookupState === "loading" ? (
        <LoadingSkeleton variant="complaint" />
      ) : null}

      {progress ? (
        <section className="grid gap-6 rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase text-muted">
                {progress.ticketId}
              </span>
              <h2 className="mt-1 text-3xl font-black text-ink">{progress.title}</h2>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-muted">
                {progress.summary}
              </p>
            </div>
            <StatusBadge tone={progress.status === "Resolved" ? "success" : "info"}>
              {progress.status === "Resolved" ? "Fixed" : progress.status}
            </StatusBadge>
          </div>

          <CitizenFixedTracker steps={progress.tracker} />

          <dl className="grid gap-3 rounded-lg border border-line bg-slate-50 p-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="font-black uppercase text-slate-400">Citizen</dt>
              <dd className="mt-1 font-bold text-ink">{progress.citizen.maskedName}</dd>
            </div>
            <div>
              <dt className="font-black uppercase text-slate-400">Phone</dt>
              <dd className="mt-1 font-bold text-ink">{progress.citizen.maskedPhone}</dd>
            </div>
            <div>
              <dt className="font-black uppercase text-slate-400">Sector</dt>
              <dd className="mt-1 font-bold text-ink">{progress.sector}</dd>
            </div>
            <div>
              <dt className="font-black uppercase text-slate-400">Department</dt>
              <dd className="mt-1 font-bold text-ink">
                {progress.assignedDepartment}
              </dd>
            </div>
          </dl>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <History size={18} className="text-teal-700" />
              <h3 className="text-xl font-black text-ink">Officer action log</h3>
            </div>
            <div className="grid gap-3">
              {progress.auditTrail.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-lg border border-line bg-slate-50 p-4"
                >
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
                  {entry.note ? (
                    <p className="mt-2 text-sm leading-6 text-muted">{entry.note}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {lookupState === "not-found" ? (
        <EmptyState
          icon={<Search size={24} />}
          title="Ticket not found"
          description={lookupError || `No progress record exists for ${searchedTicket}.`}
        />
      ) : null}
    </div>
  );
}
