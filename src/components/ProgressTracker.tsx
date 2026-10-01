import { Check, Circle } from "lucide-react";
import type { ComplaintStatus } from "../types/dashboard";
import { statusStages } from "../utils/complaintAdapters";
import { cn } from "../utils/cn";
import type { DashboardLanguage } from "../types/dashboard";

interface ProgressTrackerProps {
  status: ComplaintStatus;
  language?: DashboardLanguage;
  compact?: boolean;
}

const progressCopy: Record<
  DashboardLanguage,
  {
    aria: (status: string) => string;
    stages: Record<ComplaintStatus, string>;
  }
> = {
  en: {
    aria: (status) => `Complaint progress: ${status}`,
    stages: {
      Received: "Received",
      Assigned: "Assigned",
      "In Progress": "In Progress",
      Resolved: "Resolved",
    },
  },
  hi: {
    aria: (status) => `शिकायत प्रगति: ${status}`,
    stages: {
      Received: "प्राप्त",
      Assigned: "असाइन",
      "In Progress": "काम जारी",
      Resolved: "हल",
    },
  },
  hinglish: {
    aria: (status) => `Complaint progress: ${status}`,
    stages: {
      Received: "Received",
      Assigned: "Assigned",
      "In Progress": "In Progress",
      Resolved: "Resolved",
    },
  },
};

export function ProgressTracker({
  status,
  language = "en",
  compact = false,
}: ProgressTrackerProps) {
  const copy = progressCopy[language];
  const currentIndex = Math.max(0, statusStages.indexOf(status));

  return (
    <div className="w-full" aria-label={copy.aria(copy.stages[status] ?? status)}>
      <div className="relative grid grid-cols-4 gap-2">
        <div className="absolute left-0 right-0 top-4 h-1 rounded-full bg-slate-200" />
        <div
          className="absolute left-0 top-4 h-1 rounded-full bg-gradient-to-r from-teal-500 to-blue-600 transition-all duration-500"
          style={{ width: `${(currentIndex / (statusStages.length - 1)) * 100}%` }}
        />

        {statusStages.map((stage, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={stage} className="relative grid justify-items-center gap-2">
              <span
                className={cn(
                  "z-10 grid size-9 place-items-center rounded-full border text-xs transition",
                  isComplete &&
                    "border-teal-500 bg-teal-500 text-white shadow-md shadow-teal-100",
                  isCurrent &&
                    "border-blue-600 bg-white text-blue-700 shadow-md shadow-blue-100 ring-4 ring-blue-50",
                  !isComplete && !isCurrent && "border-slate-200 bg-white text-slate-400",
                )}
              >
                {isComplete ? <Check size={15} /> : <Circle size={12} />}
              </span>
              <span
                className={cn(
                  "text-center font-bold text-slate-500",
                  compact ? "text-[10px]" : "text-xs",
                  (isComplete || isCurrent) && "text-ink",
                )}
              >
                {copy.stages[stage] ?? stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
