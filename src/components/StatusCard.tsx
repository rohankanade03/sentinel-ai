import type { StatusLane } from "../types/dashboard";
import { cn } from "../utils/cn";

const toneClass: Record<StatusLane["tone"], string> = {
  rose: "border-l-rose-500",
  blue: "border-l-blue-500",
  amber: "border-l-amber-500",
  emerald: "border-l-emerald-500",
};

interface StatusCardProps {
  lane: StatusLane;
}

export function StatusCard({ lane }: StatusCardProps) {
  return (
    <article
      className={cn(
        "rounded-xl border border-l-4 border-line bg-white/90 p-4 shadow-sm",
        toneClass[lane.tone],
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted">{lane.label}</span>
        <strong className="text-3xl font-black text-ink">{lane.count}</strong>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{lane.description}</p>
    </article>
  );
}
