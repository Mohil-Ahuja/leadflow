import clsx from "clsx";
import { Fragment } from "react";

import { formatTime, relativeDay } from "@/lib/time";
import type { Lead } from "@/lib/types";

import { LeadRow } from "./lead-row";

interface AgendaProps {
  today: Lead[];
  overdue: Lead[];
  now: Date;
  onOpen: (lead: Lead) => void;
  highlightedId: number | null;
}

/**
 * The pinned part of the list: today's follow-ups laid out against the clock,
 * with a "now" line between what is already due and what is still ahead, and
 * anything missed from earlier days called out in red above it.
 */
export function Agenda({ today, overdue, now, onOpen, highlightedId }: AgendaProps) {
  const nowIndex = today.findIndex((lead) => new Date(lead.follow_up_at!) > now);
  const nowLineAt = nowIndex === -1 ? today.length : nowIndex;

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <section aria-labelledby="overdue-heading">
          <SectionHeading id="overdue-heading" title="Overdue" count={overdue.length} tone="overdue" />
          <ol className="overflow-hidden rounded-xl border border-overdue-line bg-surface">
            {overdue.map((lead) => {
              const at = new Date(lead.follow_up_at!);
              return (
                <li key={lead.id} className="flex border-b border-overdue-line/60 last:border-b-0">
                  <TimeCell tone="overdue" primary={relativeDay(at, now)} secondary={formatTime(at)} />
                  <div className="min-w-0 flex-1">
                    <LeadRow lead={lead} now={now} onOpen={onOpen} highlighted={lead.id === highlightedId} showFollowUp={false} />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {today.length > 0 && (
        <section aria-labelledby="today-heading">
          <SectionHeading id="today-heading" title="Due today" count={today.length} tone="due" />
          <ol className="overflow-hidden rounded-xl border border-due-line bg-surface">
            {today.map((lead, index) => {
              const at = new Date(lead.follow_up_at!);
              const passed = at <= now;
              return (
                <Fragment key={lead.id}>
                  {index === nowLineAt && <NowLine now={now} />}
                  <li className="flex border-b border-line last:border-b-0">
                    <TimeCell
                      tone={passed ? "overdue" : "due"}
                      primary={formatTime(at)}
                      secondary={passed ? "Overdue" : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <LeadRow lead={lead} now={now} onOpen={onOpen} highlighted={lead.id === highlightedId} showFollowUp={false} />
                    </div>
                  </li>
                </Fragment>
              );
            })}
            {nowLineAt === today.length && <NowLine now={now} />}
          </ol>
        </section>
      )}
    </div>
  );
}

export function SectionHeading({
  id,
  title,
  count,
  tone,
}: {
  id: string;
  title: string;
  count: number;
  tone?: "due" | "overdue";
}) {
  return (
    <h2 id={id} className="mb-2.5 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
      {tone && (
        <span className={clsx("size-2 rounded-full", tone === "due" ? "bg-due" : "bg-overdue")} aria-hidden />
      )}
      {title}
      <span className="tabular rounded-full bg-line px-2 py-px text-xs font-medium text-ink-soft">{count}</span>
    </h2>
  );
}

function TimeCell({ primary, secondary, tone }: { primary: string; secondary?: string; tone: "due" | "overdue" }) {
  return (
    <div
      className={clsx(
        "tabular flex w-[72px] shrink-0 flex-col justify-center border-r px-2.5 text-right sm:w-[104px] sm:px-4",
        tone === "overdue" ? "border-overdue-line/60 bg-overdue-tint/60" : "border-due-line/70 bg-due-tint/50",
      )}
    >
      <span className={clsx("text-[13px] font-semibold sm:text-[14px]", tone === "overdue" ? "text-overdue" : "text-due")}>{primary}</span>
      {secondary && <span className="text-[12px] text-overdue">{secondary}</span>}
    </div>
  );
}

function NowLine({ now }: { now: Date }) {
  return (
    <li aria-label={`Now, ${formatTime(now)}`} className="relative flex h-0 items-center">
      <span className="tabular absolute left-0 z-10 -translate-y-px rounded-r-full bg-primary px-2 py-px text-[11px] font-semibold text-primary-ink">
        Now {formatTime(now)}
      </span>
      <span className="h-0.5 w-full bg-primary" aria-hidden />
    </li>
  );
}
