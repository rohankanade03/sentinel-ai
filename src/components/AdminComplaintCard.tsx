import { ChevronDown, Clock3, Link2, MapPin, MessageCircle, Phone, ShieldCheck, Siren } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { ComplaintCardModel } from "../types/dashboard";
import { normalizeComplaint } from "../utils/complaintAdapters";
import { cn } from "../utils/cn";
import { AISummary } from "./AISummary";
import { ProgressTracker } from "./ProgressTracker";
import { SLACountdown } from "./SLACountdown";
import { StatusBadge } from "./StatusBadge";

interface AdminComplaintCardProps {
  complaint: ComplaintCardModel;
}

const urgencyTone = {
  Critical: "critical",
  High: "high",
  Medium: "medium",
  Low: "low",
} as const;

const communicationTone = {
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  answered: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  sent: "bg-blue-50 text-blue-700 ring-blue-100",
  processing: "bg-blue-50 text-blue-700 ring-blue-100",
  queued: "bg-slate-50 text-slate-600 ring-slate-100",
  retrying: "bg-amber-50 text-amber-700 ring-amber-100",
  failed: "bg-rose-50 text-rose-700 ring-rose-100",
  skipped: "bg-slate-50 text-slate-500 ring-slate-100",
  "no-answer": "bg-amber-50 text-amber-700 ring-amber-100",
  busy: "bg-amber-50 text-amber-700 ring-amber-100",
  canceled: "bg-rose-50 text-rose-700 ring-rose-100",
  undelivered: "bg-rose-50 text-rose-700 ring-rose-100",
} as const;

function CommunicationPill({
  icon,
  label,
  status,
}: {
  icon: ReactNode;
  label: string;
  status?: string;
}) {
  const normalizedStatus = status || "queued";
  const tone =
    communicationTone[normalizedStatus as keyof typeof communicationTone] ??
    "bg-slate-50 text-slate-600 ring-slate-100";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase ring-1", tone)}>
      {icon}
      {label}: {normalizedStatus.replace("-", " ")}
    </span>
  );
}

export function AdminComplaintCard({ complaint }: AdminComplaintCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const normalized = normalizeComplaint(complaint);

  return (
    <article className="masonry-item rounded-xl border border-white/80 bg-white p-5 shadow-sm ring-1 ring-slate-100 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge tone={urgencyTone[complaint.urgency]}>
          {normalized.urgencyKey}
        </StatusBadge>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Clock3 size={14} />
          {complaint.reportedAt}
        </span>
      </div>

      <div className="my-4">
        <span className="text-xs font-black uppercase text-blue-700">
          {complaint.category}
        </span>
        <h3 className="mt-2 text-xl font-black leading-tight text-ink">
          {complaint.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted">{complaint.summary}</p>
      </div>

      <AISummary summary={normalized.aiSummary} confidence={complaint.confidence} />

      <div className="mt-4 grid gap-3 rounded-lg border border-line bg-slate-50/80 p-4">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <MapPin size={15} />
          <span className="truncate">{normalized.sector}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <ShieldCheck size={15} />
          <span className="truncate">{normalized.assignedDepartment}</span>
        </div>
        <ProgressTracker status={complaint.status} compact />
      </div>

      <div className="mt-4">
        <SLACountdown createdAt={normalized.createdAt} urgency={complaint.urgency} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <CommunicationPill
          icon={<Phone size={13} />}
          label="Call"
          status={complaint.communication?.callStatus}
        />
        <CommunicationPill
          icon={<MessageCircle size={13} />}
          label="WhatsApp"
          status={complaint.communication?.whatsappStatus}
        />
        {complaint.communication?.smsStatus ? (
          <CommunicationPill
            icon={<MessageCircle size={13} />}
            label="SMS"
            status={complaint.communication.smsStatus}
          />
        ) : null}
        {complaint.communication?.emergencyAlertStatus ? (
          <CommunicationPill
            icon={<Siren size={13} />}
            label="Alert"
            status={complaint.communication.emergencyAlertStatus}
          />
        ) : null}
      </div>

      <button
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-black text-ink transition hover:bg-slate-50"
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? "Hide audit details" : "View audit details"}
        <ChevronDown
          size={16}
          className={cn("transition", isExpanded && "rotate-180")}
        />
      </button>

      {isExpanded ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-line bg-slate-50 p-4">
          <div>
            <dt className="text-[11px] font-black uppercase text-slate-400">Ticket</dt>
            <dd className="mt-1 text-sm font-bold text-ink">{normalized.ticketId}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-black uppercase text-slate-400">Status</dt>
            <dd className="mt-1 text-sm font-bold text-ink">{complaint.status}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[11px] font-black uppercase text-slate-400">Latest action</dt>
            <dd className="mt-1 text-sm font-bold text-ink">
              {complaint.audit?.latestAction ?? "Audit pending"}
            </dd>
          </div>
          {complaint.trackingUrl ? (
            <div className="col-span-2">
              <dt className="text-[11px] font-black uppercase text-slate-400">Tracking link</dt>
              <dd className="mt-1">
                <a
                  className="inline-flex items-center gap-1.5 text-sm font-black text-blue-700 hover:text-blue-900"
                  href={complaint.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Link2 size={14} />
                  Open citizen tracking
                </a>
              </dd>
            </div>
          ) : null}
          {complaint.communication?.history?.length ? (
            <div className="col-span-2">
              <dt className="text-[11px] font-black uppercase text-slate-400">Communication history</dt>
              <dd className="mt-2 grid gap-2">
                {complaint.communication.history.slice(0, 4).map((entry) => (
                  <span
                    key={entry._id || entry.id || `${entry.type}-${entry.createdAt}`}
                    className="rounded-md border border-white bg-white px-3 py-2 text-xs font-bold text-muted"
                  >
                    {entry.type.replace("_", " ")} · {entry.status.replace("-", " ")}
                    {entry.attempts ? ` · attempt ${entry.attempts}` : ""}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </article>
  );
}
