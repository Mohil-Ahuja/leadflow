import clsx from "clsx";
import { CalendarClock } from "lucide-react";

import { formatFollowUp, formatTime, relativeDay, timeAgo } from "@/lib/time";
import type { Discussion } from "@/lib/types";

interface TimelineProps {
  discussions: Discussion[] | undefined;
  isLoading: boolean;
  error: Error | null;
  now: Date;
  freshId: number | null;
}

/** Discussion history, newest first, grouped under a heading per day. */
export function Timeline({ discussions, isLoading, error, now, freshId }: TimelineProps) {
  if (isLoading) return <TimelineSkeleton />;
  if (error) {
    return (
      <p role="alert" className="m-6 rounded-lg bg-overdue-tint px-4 py-3 text-sm text-overdue">
        Couldn&apos;t load the history: {error.message}
      </p>
    );
  }
  if (!discussions?.length) return null;

  const days: { label: string; items: Discussion[] }[] = [];
  for (const discussion of discussions) {
    const label = relativeDay(new Date(discussion.created_at), now);
    const current = days.at(-1);
    if (current?.label === label) current.items.push(discussion);
    else days.push({ label, items: [discussion] });
  }
  const latestNoteId = discussions.find((d) => d.kind === "note")?.id;

  return (
    <div className="px-5 py-5 sm:px-6">
      {days.map((day) => (
        <section key={day.label} aria-label={day.label} className="mb-2">
          <h3 className="mb-3 text-[13px] font-semibold text-ink-soft">{day.label}</h3>
          <ol className="relative ml-[5px] border-l border-line pb-2">
            {day.items.map((d) =>
              d.kind === "system" ? (
                <SystemEntry key={d.id} discussion={d} />
              ) : (
                <NoteEntry key={d.id} discussion={d} now={now} latest={d.id === latestNoteId} fresh={d.id === freshId} />
              ),
            )}
          </ol>
        </section>
      ))}
    </div>
  );
}

function NoteEntry({
  discussion,
  now,
  latest,
  fresh,
}: {
  discussion: Discussion;
  now: Date;
  latest: boolean;
  fresh: boolean;
}) {
  return (
    <li className="relative mb-4 pl-6 last:mb-0">
      <span
        className={clsx(
          "absolute -left-[6px] top-1.5 size-[11px] rounded-full border-2 border-surface",
          latest ? "bg-primary ring-4 ring-primary/15" : "bg-line-strong",
        )}
        aria-hidden
      />
      <p className="tabular mb-1.5 text-[13px] text-ink-faint">
        <time dateTime={discussion.created_at} className="font-medium text-ink-soft">
          {formatTime(new Date(discussion.created_at))}
        </time>
        <span className="ml-2">{timeAgo(discussion.created_at, now)}</span>
      </p>
      <div
        className={clsx(
          "rounded-xl border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink",
          fresh && "anim-flash",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{discussion.note}</p>
        {discussion.follow_up_at && (
          <p className="tabular mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-primary-tint px-2 py-1 text-[13px] font-medium text-primary">
            <CalendarClock className="size-3.5" aria-hidden />
            Follow-up set for {formatFollowUp(discussion.follow_up_at, now)}
          </p>
        )}
      </div>
    </li>
  );
}

function SystemEntry({ discussion }: { discussion: Discussion }) {
  return (
    <li className="relative mb-4 pl-6 last:mb-0">
      <span className="absolute -left-[3.5px] top-[7px] size-[6px] rounded-full bg-ink-faint" aria-hidden />
      <p className="tabular text-[13px] text-ink-faint">
        <span className="text-ink-soft">{discussion.note}</span>
        <time dateTime={discussion.created_at} className="ml-2">
          {formatTime(new Date(discussion.created_at))}
        </time>
      </p>
    </li>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-5 px-6 py-6" aria-busy="true" aria-label="Loading history">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 pl-6">
          <div className="h-3 w-24 animate-pulse rounded bg-line" />
          <div className="h-16 animate-pulse rounded-xl bg-sunken" />
        </div>
      ))}
    </div>
  );
}
