import clsx from "clsx";
import { AlarmClock, BellRing, CalendarClock } from "lucide-react";

import { followUpState, formatFollowUp } from "@/lib/time";

const styles = {
  overdue: "bg-overdue-tint text-overdue border-overdue-line",
  today: "bg-due-tint text-due border-due-line",
  upcoming: "bg-sunken text-ink-soft border-line",
} as const;

const icons = { overdue: AlarmClock, today: BellRing, upcoming: CalendarClock } as const;

export function FollowUpChip({ at, now, className }: { at: string; now: Date; className?: string }) {
  const state = followUpState(at, now);
  const Icon = icons[state];
  return (
    <span
      className={clsx(
        "tabular inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[12.5px] font-medium",
        styles[state],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {state === "overdue" && <span className="sr-only">Overdue:</span>}
      {formatFollowUp(at, now)}
    </span>
  );
}
