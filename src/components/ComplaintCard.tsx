import {
  Clock3,
  FileText,
  History,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { ComplaintCardModel, UrgencyLevel } from "../types/dashboard";
import { cn } from "../utils/cn";
import { normalizeComplaint } from "../utils/complaintAdapters";
import { AISummary } from "./AISummary";
import { SLACountdown } from "./SLACountdown";

const urgencyTone: Record<UrgencyLevel, "critical" | "high" | "medium" | "low"> = {
  Critical: "critical",
  High: "high",
  Medium: "medium",
  Low: "low",
};

const sizeClass: Record<NonNullable<ComplaintCardModel["visualSize"]>, string> = {
  compact: "min-h-[292px]",
  standard: "min-h-[356px]",
  tall: "min-h-[456px]",
  wide: "min-h-[392px]",
};

const toneClass: Record<NonNullable<ComplaintCardModel["cardTone"]>, string> = {
  calm: "from-white to-white",
  alert: "from-rose-50 to-white border-rose-100",
  civic: "from-teal-50 to-white border-teal-100",
  field: "from-blue-50 to-white border-blue-100",
  health: "from-amber-50 to-white border-amber-100",
};

interface ComplaintCardProps {
  complaint: ComplaintCardModel;
}

export function ComplaintCard({ complaint }: ComplaintCardProps) {
  const size = complaint.visualSize ?? "standard";
  const normalized = normalizeComplaint(complaint);

  return (
    <article
      className={cn(
        "masonry-item animate-rise rounded-xl border border-white/70 bg-gradient-to-b p-5 shadow-sm ring-1 ring-slate-100/70 transition duration-300 hover:-translate-y-1.5 hover:shadow-lift",
        sizeClass[size],
        toneClass[complaint.cardTone ?? "calm"],
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <StatusBadge tone={urgencyTone[complaint.urgency]}>
          {complaint.urgency}
        </StatusBadge>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Clock3 size={14} />
          {complaint.reportedAt}
        </span>
      </div>

      <div className="my-6">
        <span className="text-xs font-black uppercase text-teal-700">
          {complaint.category}
        </span>
        <h3 className="mt-2 text-2xl font-black leading-tight text-ink">
          {complaint.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted">{complaint.summary}</p>
      </div>

      <div className="grid gap-3 rounded-lg border border-line bg-slate-50/80 p-4">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <MapPin size={15} />
          <span className="truncate">{complaint.location}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <FileText size={15} />
          <span className="truncate">{complaint.ticketId ?? "Ticket ID placeholder"}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <ShieldCheck size={15} />
          <span className="truncate">
            {complaint.aiClassificationLabel ?? "AI classification pending"}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <UserRound size={15} />
          <span className="truncate">
            {complaint.citizen
              ? `${complaint.citizen.maskedName} / ${complaint.citizen.maskedPhone}`
              : "Masked citizen info pending"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <AISummary summary={normalized.aiSummary} confidence={complaint.confidence} />
        <SLACountdown createdAt={normalized.createdAt} urgency={complaint.urgency} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        {complaint.metadata.map((item) => (
          <div key={`${complaint.id}-${item.label}`} className="min-w-0">
            <dt className="text-[11px] font-bold uppercase text-slate-400">
              {item.label}
            </dt>
            <dd className="truncate text-xs font-bold text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex items-center justify-between gap-3">
        <StatusBadge tone="info">{complaint.status}</StatusBadge>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-muted">
          <History size={14} />
          <span className="truncate">
            {complaint.audit?.latestAction ?? "Audit trail placeholder"}
          </span>
        </span>
      </div>
    </article>
  );
}
