import clsx from "clsx";

import { statusColorVar, statusLabel } from "@/lib/status";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

interface PipelineFilterProps {
  counts: Record<LeadStatus, number> | undefined;
  value: LeadStatus | null;
  onChange: (status: LeadStatus | null) => void;
}

/**
 * Status filter that doubles as a picture of the pipeline: every stage shows
 * its count, and the strip underneath shows how the leads are spread.
 */
export function PipelineFilter({ counts, value, onChange }: PipelineFilterProps) {
  const total = counts ? LEAD_STATUSES.reduce((sum, s) => sum + counts[s], 0) : 0;

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Filter by status"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <FilterChip selected={value === null} onClick={() => onChange(null)} label="All" count={total} />
        {LEAD_STATUSES.map((status) => (
          <FilterChip
            key={status}
            selected={value === status}
            onClick={() => onChange(value === status ? null : status)}
            label={statusLabel(status)}
            count={counts?.[status] ?? 0}
            color={statusColorVar(status)}
          />
        ))}
      </div>

      {total > 0 && counts && (
        <div className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          {LEAD_STATUSES.filter((s) => counts[s] > 0).map((status) => (
            <span
              key={status}
              className={clsx("h-full transition-opacity", value && value !== status && "opacity-25")}
              style={{ flexGrow: counts[status], backgroundColor: statusColorVar(status) }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  selected,
  onClick,
  label,
  count,
  color,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={clsx(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border pl-3 pr-2 text-[14px] font-medium transition-colors",
        selected
          ? "border-ink bg-ink text-canvas"
          : "border-line-strong bg-surface text-ink-soft hover:border-ink-faint hover:text-ink",
      )}
    >
      {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />}
      {label}
      <span
        className={clsx(
          "tabular min-w-6 rounded-full px-1.5 text-center text-[12px]",
          selected ? "bg-canvas/20 text-canvas" : "bg-sunken text-ink-faint",
        )}
      >
        {count}
      </span>
    </button>
  );
}
