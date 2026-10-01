import { Check, Circle } from "lucide-react";
import type { CitizenProgressStep } from "../types/dashboard";
import { cn } from "../utils/cn";

interface CitizenFixedTrackerProps {
  steps: CitizenProgressStep[];
}

export function CitizenFixedTracker({ steps }: CitizenFixedTrackerProps) {
  const completedCount = steps.filter((step) => step.completed).length;
  const progress =
    steps.length > 1 ? ((completedCount - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <div className="w-full" aria-label="Complaint progress from received to fixed">
      <div className="relative grid grid-cols-4 gap-2">
        <div className="absolute left-0 right-0 top-4 h-1 rounded-full bg-slate-200" />
        <div
          className="absolute left-0 top-4 h-1 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${Math.max(0, progress)}%` }}
        />

        {steps.map((step) => (
          <div key={step.id} className="relative grid justify-items-center gap-2">
            <span
              className={cn(
                "z-10 grid size-9 place-items-center rounded-full border text-xs transition",
                step.completed
                  ? "border-teal-500 bg-teal-500 text-white shadow-md shadow-teal-100"
                  : "border-slate-200 bg-white text-slate-400",
              )}
            >
              {step.completed ? <Check size={15} /> : <Circle size={12} />}
            </span>
            <span
              className={cn(
                "text-center text-xs font-bold text-slate-500",
                step.completed && "text-ink",
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
