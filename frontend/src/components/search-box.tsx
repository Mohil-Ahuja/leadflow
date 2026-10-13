"use client";

import { Search, X } from "lucide-react";
import { forwardRef } from "react";

export const SearchBox = forwardRef<HTMLInputElement, { value: string; onChange: (value: string) => void }>(
  function SearchBox({ value, onChange }, ref) {
    return (
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onChange("");
              e.currentTarget.blur();
            }
          }}
          placeholder="Search by name or company"
          aria-label="Search leads by name or company"
          className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-10 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-faint hover:text-ink"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line-strong px-1.5 text-[11px] text-ink-faint sm:block">
            /
          </kbd>
        )}
      </div>
    );
  },
);
