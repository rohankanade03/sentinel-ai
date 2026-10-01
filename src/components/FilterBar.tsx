import { Filter } from "lucide-react";
import { SearchBar } from "./SearchBar";
import type {
  ComplaintStatus,
  DashboardFilters,
  FilterOption,
  StatusFilterOption,
} from "../types/dashboard";

interface FilterBarProps {
  filters: DashboardFilters;
  categories: FilterOption[];
  statuses: StatusFilterOption[];
  onFiltersChange: (filters: DashboardFilters) => void;
}

export function FilterBar({
  filters,
  categories,
  statuses,
  onFiltersChange,
}: FilterBarProps) {
  const updateFilter = <Key extends keyof DashboardFilters>(
    key: Key,
    value: DashboardFilters[Key],
  ) => onFiltersChange({ ...filters, [key]: value });

  return (
    <section
      className="grid gap-3 rounded-xl border border-line bg-white/90 p-3 shadow-sm backdrop-blur md:grid-cols-[minmax(260px,1fr)_auto]"
      aria-label="Search and filters"
    >
      <SearchBar
        value={filters.query}
        onChange={(value) => updateFilter("query", value)}
        placeholder="Search title, summary, location..."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-line bg-slate-50 px-4 text-muted">
          <Filter size={17} aria-hidden="true" />
          <select
            className="min-w-36 border-0 bg-transparent p-0 text-sm font-semibold text-ink focus:ring-0"
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
            aria-label="Filter by category"
          >
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-h-12 items-center rounded-lg border border-line bg-slate-50 px-4">
          <select
            className="min-w-36 border-0 bg-transparent p-0 text-sm font-semibold text-ink focus:ring-0"
            value={filters.status}
            onChange={(event) =>
              updateFilter("status", event.target.value as ComplaintStatus | "all")
            }
            aria-label="Filter by status"
          >
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
