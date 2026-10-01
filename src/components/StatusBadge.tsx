import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export type BadgeTone =
  | "neutral"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "success"
  | "info";

const toneClass: Record<BadgeTone, string> = {
  neutral: "bg-teal-50 text-teal-700 ring-teal-100",
  critical: "bg-rose-50 text-rose-700 ring-rose-100",
  high: "bg-amber-50 text-amber-700 ring-amber-100",
  medium: "bg-blue-50 text-blue-700 ring-blue-100",
  low: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  info: "bg-violet-50 text-violet-700 ring-violet-100",
};

interface StatusBadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-black ring-1",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}
