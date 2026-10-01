import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { fetchTicket } from "../api/ticketApi";
import {
  normalizeComplaint,
  type NormalizedComplaint,
  type ComplaintDataSource,
} from "../utils/complaintAdapters";
import type { ComplaintStatus } from "../types/dashboard";
import { EmptyState } from "./EmptyState";
import { ProgressTracker } from "./ProgressTracker";
import { StatusBadge } from "./StatusBadge";
import type { DashboardLanguage } from "../types/dashboard";

interface TicketLookupProps {
  complaints: ComplaintDataSource[];
  language: DashboardLanguage;
}

const ticketLookupCopy: Record<
  DashboardLanguage,
  {
    badge: string;
    title: string;
    genericError: string;
    looking: string;
    lookup: string;
    checking: string;
    reported: string;
    department: string;
    sector: string;
    notFoundTitle: string;
    notFoundDescription: string;
    backendHint: (message: string) => string;
    statuses: Record<ComplaintStatus, string>;
  }
> = {
  en: {
    badge: "Ticket lookup",
    title: "Track complaint status",
    genericError: "Ticket lookup failed. Confirm the backend is running.",
    looking: "Looking...",
    lookup: "Lookup",
    checking: "Checking backend ticket records...",
    reported: "Reported",
    department: "Department",
    sector: "Sector",
    notFoundTitle: "Ticket not found",
    notFoundDescription: "No live backend ticket matched this ID.",
    backendHint: (message) =>
      `${message}. Check that the backend is running and the ticket ID is correct.`,
    statuses: {
      Received: "Received",
      Assigned: "Assigned",
      "In Progress": "In Progress",
      Resolved: "Resolved",
    },
  },
  hi: {
    badge: "टिकट खोज",
    title: "शिकायत की स्थिति ट्रैक करें",
    genericError: "टिकट खोज विफल हुई। जांचें कि बैकएंड चल रहा है।",
    looking: "खोज रहे हैं...",
    lookup: "खोजें",
    checking: "बैकएंड टिकट रिकॉर्ड जांचे जा रहे हैं...",
    reported: "दर्ज",
    department: "विभाग",
    sector: "सेक्टर",
    notFoundTitle: "टिकट नहीं मिला",
    notFoundDescription: "इस ID से कोई लाइव बैकएंड टिकट नहीं मिला।",
    backendHint: (message) =>
      `${message}. जांचें कि बैकएंड चल रहा है और टिकट ID सही है।`,
    statuses: {
      Received: "प्राप्त",
      Assigned: "असाइन",
      "In Progress": "काम जारी",
      Resolved: "हल",
    },
  },
  hinglish: {
    badge: "Ticket lookup",
    title: "Complaint status track karein",
    genericError: "Ticket lookup fail hua. Backend running hai ya nahi check karein.",
    looking: "Dhoond rahe hain...",
    lookup: "Lookup",
    checking: "Backend ticket records check ho rahe hain...",
    reported: "Reported",
    department: "Department",
    sector: "Sector",
    notFoundTitle: "Ticket nahi mila",
    notFoundDescription: "Is ID se koi live backend ticket match nahi hua.",
    backendHint: (message) =>
      `${message}. Backend running hai aur ticket ID sahi hai, ye check karein.`,
    statuses: {
      Received: "Received",
      Assigned: "Assigned",
      "In Progress": "In Progress",
      Resolved: "Resolved",
    },
  },
};

export function TicketLookup({ complaints: _complaints, language }: TicketLookupProps) {
  const copy = ticketLookupCopy[language];
  const [ticketId, setTicketId] = useState("");
  const [searchedTicket, setSearchedTicket] = useState("");
  const [remoteResult, setRemoteResult] = useState<NormalizedComplaint | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const result = remoteResult;
  const hasSearched = searchedTicket.trim().length > 0;

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTicketId = ticketId.trim();

    setSearchedTicket(nextTicketId);
    setRemoteResult(null);
    setLookupError("");

    if (!nextTicketId) {
      return;
    }

    setIsLookingUp(true);
    try {
      setRemoteResult(normalizeComplaint(await fetchTicket(nextTicketId)));
    } catch (error) {
      setLookupError(
        error instanceof Error
          ? error.message
          : copy.genericError,
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div>
        <span className="text-xs font-black uppercase text-blue-700">
          {copy.badge}
        </span>
        <h2 className="mt-2 text-2xl font-black text-ink">{copy.title}</h2>
      </div>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleLookup}>
        <input
          className="min-h-12 flex-1 rounded-lg border border-line bg-slate-50 px-4 text-sm font-semibold text-ink outline-none transition focus:border-blue-500 focus:bg-white"
          value={ticketId}
          onChange={(event) => setTicketId(event.target.value)}
          placeholder="SEN-2026-0001"
        />
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-black text-white transition hover:-translate-y-0.5"
          type="submit"
          disabled={isLookingUp}
        >
          <Search size={18} />
          {isLookingUp ? copy.looking : copy.lookup}
        </button>
      </form>

      <div className="mt-5">
        {isLookingUp ? (
          <div className="rounded-lg border border-line bg-slate-50 p-4 text-sm font-semibold text-muted">
            {copy.checking}
          </div>
        ) : result ? (
          <article className="rounded-lg border border-line bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-xs font-black uppercase text-muted">
                  {result.ticketId}
                </span>
                <h3 className="mt-1 text-xl font-black text-ink">{result.title}</h3>
              </div>
              <StatusBadge tone="info">{copy.statuses[result.status] ?? result.status}</StatusBadge>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-black uppercase text-slate-400">{copy.reported}</dt>
                <dd className="mt-1 font-bold text-ink">{result.reportedAtLabel}</dd>
              </div>
              <div>
                <dt className="font-black uppercase text-slate-400">{copy.department}</dt>
                <dd className="mt-1 font-bold text-ink">{result.assignedDepartment}</dd>
              </div>
              <div>
                <dt className="font-black uppercase text-slate-400">{copy.sector}</dt>
                <dd className="mt-1 font-bold text-ink">{result.sector}</dd>
              </div>
            </dl>

            <div className="mt-5">
              <ProgressTracker status={result.status} language={language} />
            </div>
          </article>
        ) : hasSearched ? (
          <EmptyState
            icon={<Search size={24} />}
            title={copy.notFoundTitle}
            description={
              lookupError
                ? copy.backendHint(lookupError)
                : copy.notFoundDescription
            }
          />
        ) : null}
      </div>
    </section>
  );
}
