import clsx from "clsx";

import { OPEN_STAGES, STATUS_META, statusColorVar, statusLabel } from "@/lib/status";
import type { LeadStatus } from "@/lib/types";

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const color = statusColorVar(status);
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12.5px] font-medium",
        className,
      )}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {statusLabel(status)}
    </span>
  );
}

/**
 * Four ticks for the four open stages, filled up to where the lead stands.
 * Won fills every tick; lost leaves them hollow. Reads at a glance how far
 * along each deal is, which a badge alone can't show.
 */
export function StageMeter({ status }: { status: LeadStatus }) {
  const stage = STATUS_META[status].stage;
  const color = statusColorVar(status);
  const filled = status === "won" ? OPEN_STAGES.length : (stage ?? 0);
  const label =
    stage !== null ? `Stage ${stage} of ${OPEN_STAGES.length}: ${statusLabel(status)}` : statusLabel(status);

  return (
    <span className="flex items-center gap-[3px]" role="img" aria-label={label} title={label}>
      {OPEN_STAGES.map((s, index) => (
        <span
          key={s}
          className={clsx("h-1.5 w-3.5 rounded-full", status === "lost" && "border border-dashed border-line-strong")}
          style={index < filled ? { backgroundColor: color } : status !== "lost" ? { backgroundColor: "var(--line)" } : {}}
        />
      ))}
    </span>
  );
}
