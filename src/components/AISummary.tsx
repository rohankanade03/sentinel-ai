import { Sparkles } from "lucide-react";

interface AISummaryProps {
  summary: string;
  confidence?: number;
}

export function AISummary({ summary, confidence }: AISummaryProps) {
  return (
    <div className="rounded-lg border border-teal-100 bg-teal-50/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-teal-700">
          <Sparkles size={15} />
          AI summary
        </span>
        {typeof confidence === "number" ? (
          <span className="text-xs font-bold text-teal-700">
            {Math.round(confidence * 100)}%
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink">{summary}</p>
    </div>
  );
}
