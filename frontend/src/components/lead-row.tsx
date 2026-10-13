import clsx from "clsx";

import { timeAgo } from "@/lib/time";
import type { Lead } from "@/lib/types";

import { FollowUpChip } from "./follow-up-chip";
import { StageMeter, StatusBadge } from "./status";

interface LeadRowProps {
  lead: Lead;
  now: Date;
  onOpen: (lead: Lead) => void;
  highlighted?: boolean;
  /** Hide the follow-up chip when the row already sits under a time in the agenda. */
  showFollowUp?: boolean;
}

export function LeadRow({ lead, now, onOpen, highlighted, showFollowUp = true }: LeadRowProps) {
  const closed = lead.status === "won" || lead.status === "lost";

  return (
    <button
      type="button"
      onClick={() => onOpen(lead)}
      aria-haspopup="dialog"
      className={clsx(
        "group grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 px-4 py-3.5 text-left transition-colors sm:px-5",
        "hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-offset-[-2px]",
        highlighted && "anim-flash",
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <span className={clsx("truncate font-display text-[16.5px] font-semibold", closed ? "text-ink-soft" : "text-ink")}>
            {lead.name}
          </span>
          {lead.company && <span className="truncate text-sm text-ink-faint">{lead.company}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3 justify-self-end">
        <span className="hidden sm:block">
          <StageMeter status={lead.status} />
        </span>
        <StatusBadge status={lead.status} />
      </div>

      <div className="col-span-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <p className="min-w-0 flex-1 truncate text-[14px] text-ink-soft">
          {lead.last_note ? (
            <>
              <span className="text-ink">{lead.last_note.note}</span>
              <span className="tabular ml-2 whitespace-nowrap text-[13px] text-ink-faint">
                {timeAgo(lead.last_note.created_at, now)}
              </span>
            </>
          ) : (
            <span className="italic text-ink-faint">No discussions yet. Open to log the first one.</span>
          )}
        </p>
        {showFollowUp && lead.follow_up_at && <FollowUpChip at={lead.follow_up_at} now={now} className="self-start" />}
      </div>
    </button>
  );
}
