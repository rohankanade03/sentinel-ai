import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, placeholder, onChange }: SearchBarProps) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-lg border border-line bg-slate-50 px-4 text-muted">
      <Search size={18} aria-hidden="true" />
      <input
        className="w-full border-0 bg-transparent p-0 text-sm text-ink placeholder:text-slate-400 focus:ring-0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
      />
    </label>
  );
}
