import { cn } from "../utils/cn";

interface LoadingSkeletonProps {
  variant: "stat" | "complaint" | "status";
}

const heightClass: Record<LoadingSkeletonProps["variant"], string> = {
  stat: "min-h-36",
  complaint: "min-h-[360px] masonry-item",
  status: "min-h-28",
};

export function LoadingSkeleton({ variant }: LoadingSkeletonProps) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-white/90 p-5 shadow-sm",
        heightClass[variant],
      )}
      aria-hidden="true"
    >
      <span className="block h-3.5 w-2/5 animate-pulse rounded-full bg-slate-200" />
      <strong className="mt-5 block h-8 w-2/3 animate-pulse rounded-full bg-slate-200" />
      <p className="mt-6 block h-3.5 w-1/2 animate-pulse rounded-full bg-slate-200" />
      {variant === "complaint" ? (
        <div className="mt-8 grid gap-4">
          <div className="h-3 rounded-full bg-slate-200" />
          <div className="h-3 w-4/5 rounded-full bg-slate-200" />
          <div className="h-3 w-3/5 rounded-full bg-slate-200" />
        </div>
      ) : null}
    </article>
  );
}
