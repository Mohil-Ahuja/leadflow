"use client";

import clsx from "clsx";
import { CalendarPlus, X } from "lucide-react";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";

import { ApiError } from "@/lib/api";
import { useAddDiscussion } from "@/lib/queries";
import { followUpPresets, formatFollowUp, fromInputs, toDateInput, toTimeInput } from "@/lib/time";
import type { DiscussionCreated } from "@/lib/types";

import { Button } from "../ui/button";
import { inputClass } from "../ui/field";

interface ComposerProps {
  leadId: number;
  now: Date;
  onSaved: (result: DiscussionCreated) => void;
}

type FollowUpChoice = { kind: "none" } | { kind: "preset"; id: string } | { kind: "custom" };

export function Composer({ leadId, now, onSaved }: ComposerProps) {
  const addDiscussion = useAddDiscussion(leadId);
  const [note, setNote] = useState("");
  const [choice, setChoice] = useState<FollowUpChoice>({ kind: "none" });
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("10:00");
  const [localError, setLocalError] = useState<string>();

  // Presets follow the clock, so "Today 4 PM" moves on once that hour is close.
  const presets = useMemo(() => followUpPresets(now), [now]);

  const followUp: Date | null =
    choice.kind === "preset"
      ? (presets.find((p) => p.id === choice.id)?.date ?? null)
      : choice.kind === "custom"
        ? fromInputs(customDate, customTime)
        : null;

  const serverError = addDiscussion.error;
  const fieldErrors = serverError instanceof ApiError ? serverError.fieldErrors : {};
  const error =
    localError ?? fieldErrors.note ?? fieldErrors.follow_up_at ?? (serverError && !Object.keys(fieldErrors).length ? serverError.message : undefined);

  function reset() {
    setNote("");
    setChoice({ kind: "none" });
    setCustomDate("");
    setCustomTime("10:00");
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    setLocalError(undefined);
    addDiscussion.reset();

    if (!note.trim()) {
      setLocalError("Write a note before saving");
      return;
    }
    if (choice.kind === "custom") {
      if (!followUp) {
        setLocalError("Pick a date and time for the follow-up, or turn it off");
        return;
      }
      if (followUp < now) {
        setLocalError("Pick a follow-up time in the future");
        return;
      }
    }

    addDiscussion.mutate(
      { note, follow_up_at: followUp?.toISOString() ?? null },
      {
        onSuccess: (result) => {
          reset();
          onSaved(result);
        },
      },
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
  }

  function openCustom() {
    if (choice.kind === "custom") return;
    const base = followUp ?? presets.find((p) => p.id === "tomorrow")?.date ?? now;
    setCustomDate(toDateInput(base));
    setCustomTime(toTimeInput(base));
    setChoice({ kind: "custom" });
  }

  return (
    <form onSubmit={submit} className="border-t border-line bg-sunken px-5 pb-5 pt-4 sm:px-6" aria-label="Log a discussion">
      <label htmlFor="discussion-note" className="sr-only">
        Discussion note
      </label>
      <textarea
        id="discussion-note"
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setLocalError(undefined);
        }}
        onKeyDown={onKeyDown}
        rows={3}
        maxLength={5000}
        placeholder="What did you talk about? Next steps, objections, who else is involved…"
        className={clsx(inputClass, "resize-none leading-relaxed")}
        aria-invalid={error && !fieldErrors.follow_up_at ? true : undefined}
      />

      <fieldset className="mt-3">
        <legend className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
          <CalendarPlus className="size-3.5" aria-hidden />
          Follow up
        </legend>
        <div className="flex flex-wrap gap-1.5">
          <ChoiceChip selected={choice.kind === "none"} onClick={() => setChoice({ kind: "none" })}>
            No follow-up
          </ChoiceChip>
          {presets.map((preset) => (
            <ChoiceChip
              key={preset.id}
              selected={choice.kind === "preset" && choice.id === preset.id}
              onClick={() => setChoice({ kind: "preset", id: preset.id })}
            >
              {preset.label}
            </ChoiceChip>
          ))}
          <ChoiceChip selected={choice.kind === "custom"} onClick={openCustom}>
            Pick date &amp; time
          </ChoiceChip>
        </div>

        {choice.kind === "custom" && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="Follow-up date"
              value={customDate}
              min={toDateInput(now)}
              onChange={(e) => setCustomDate(e.target.value)}
              className={clsx(inputClass, "h-10 w-auto py-0")}
            />
            <input
              type="time"
              aria-label="Follow-up time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className={clsx(inputClass, "h-10 w-auto py-0")}
            />
            <Button variant="ghost" size="sm" onClick={() => setChoice({ kind: "none" })} aria-label="Remove follow-up">
              <X className="size-4" />
            </Button>
          </div>
        )}
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="min-h-5 text-[13px]" aria-live="polite">
          {error ? (
            <span role="alert" className="text-overdue">
              {error}
            </span>
          ) : followUp ? (
            <span className="tabular text-ink-soft">
              Follow-up will be set for <span className="font-medium text-ink">{formatFollowUp(followUp.toISOString(), now)}</span>
            </span>
          ) : (
            <span className="hidden text-ink-faint sm:inline">Ctrl + Enter to save</span>
          )}
        </p>
        <Button type="submit" disabled={addDiscussion.isPending}>
          {addDiscussion.isPending ? "Saving…" : "Save note"}
        </Button>
      </div>
    </form>
  );
}

function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        "tabular h-8 rounded-full border px-3 text-[13px] font-medium transition-colors",
        selected
          ? "border-primary bg-primary-tint text-primary"
          : "border-line-strong bg-surface text-ink-soft hover:border-ink-faint hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
