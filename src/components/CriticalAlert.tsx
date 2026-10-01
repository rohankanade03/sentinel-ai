import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import {
  getLatestComplaint,
  normalizeComplaints,
  type ComplaintDataSource,
} from "../utils/complaintAdapters";

interface CriticalAlertProps {
  complaints: ComplaintDataSource[];
}

function getAlertKey(complaintId?: string) {
  return complaintId ? `critical-${complaintId}` : "";
}

export default function CriticalAlert({ complaints }: CriticalAlertProps) {
  const latestCritical = useMemo(() => {
    const criticalComplaints = normalizeComplaints(complaints).filter(
      (complaint) => complaint.urgencyKey === "CRITICAL",
    );

    return getLatestComplaint(criticalComplaints);
  }, [complaints]);

  const [dismissedKey, setDismissedKey] = useState("");
  const alertKey = getAlertKey(latestCritical?.id);

  useEffect(() => {
    if (alertKey && dismissedKey && alertKey !== dismissedKey) {
      setDismissedKey("");
    }
  }, [alertKey, dismissedKey]);

  if (!latestCritical || dismissedKey === alertKey) {
    return null;
  }

  return (
    <section
      className="critical-alert mb-5 flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-white shadow-xl shadow-red-200 ring-1 ring-red-300 sm:px-5"
      role="alert"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/15">
          <AlertTriangle size={22} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-wide">
            {"\u{1F6A8}"} CRITICAL ALERT {"\u2014"} {latestCritical.category} in{" "}
            {latestCritical.sector}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-red-50">
            Critical complaint detected: {latestCritical.title}
          </p>
        </div>
      </div>
      <button
        className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
        type="button"
        aria-label="Dismiss critical alert"
        onClick={() => setDismissedKey(alertKey)}
      >
        <X size={18} />
      </button>
    </section>
  );
}
