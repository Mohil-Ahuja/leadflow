import {
  addDays,
  addHours,
  differenceInCalendarDays,
  differenceInSeconds,
  endOfDay,
  format,
  formatDistanceStrict,
  isSameDay,
  nextMonday,
  setHours,
  startOfDay,
  startOfHour,
} from "date-fns";

import type { Lead } from "./types";

/** "just now", "5 minutes ago", "2 days ago". */
export function timeAgo(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Math.abs(differenceInSeconds(now, date)) < 60) return "just now";
  return formatDistanceStrict(date, now, { addSuffix: true, roundingMethod: "floor" });
}

export const formatTime = (date: Date) => format(date, "h:mm a");

/** A day relative to now: "Today", "Yesterday", "Tomorrow", "Thursday", "12 Oct", "12 Oct 2025". */
export function relativeDay(date: Date, now: Date): string {
  const diff = differenceInCalendarDays(date, now);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return format(date, "EEEE");
  if (date.getFullYear() === now.getFullYear()) return format(date, "d MMM");
  return format(date, "d MMM yyyy");
}

/** "Today, 2:00 PM", "Tomorrow, 10:00 AM", "Mon, 3:00 PM". */
export function formatFollowUp(iso: string, now: Date): string {
  const date = new Date(iso);
  return `${relativeDay(date, now)}, ${formatTime(date)}`;
}

export type FollowUpState = "overdue" | "today" | "upcoming";

export function followUpState(iso: string, now: Date): FollowUpState {
  const date = new Date(iso);
  if (date < now) return "overdue";
  if (isSameDay(date, now)) return "today";
  return "upcoming";
}

export interface GroupedLeads {
  /** Follow-ups scheduled for today (in the viewer's timezone), earliest first. */
  today: Lead[];
  /** Follow-ups from before today that were never dealt with, oldest first. */
  overdue: Lead[];
  /** Everyone else, in the order the API returned them. */
  rest: Lead[];
}

/** Split leads into the pinned agenda (today + overdue) and the rest of the list. */
export function groupLeads(leads: Lead[], now: Date): GroupedLeads {
  const dayStart = startOfDay(now).getTime();
  const dayEnd = endOfDay(now).getTime();
  const byFollowUp = (a: Lead, b: Lead) => Date.parse(a.follow_up_at!) - Date.parse(b.follow_up_at!);

  const today: Lead[] = [];
  const overdue: Lead[] = [];
  const rest: Lead[] = [];

  for (const lead of leads) {
    const at = lead.follow_up_at ? Date.parse(lead.follow_up_at) : null;
    if (at !== null && at >= dayStart && at <= dayEnd) today.push(lead);
    else if (at !== null && at < dayStart) overdue.push(lead);
    else rest.push(lead);
  }

  return { today: today.sort(byFollowUp), overdue: overdue.sort(byFollowUp), rest };
}

export interface FollowUpPreset {
  id: string;
  label: string;
  date: Date;
}

/** One-click follow-up times for the discussion form. */
export function followUpPresets(now: Date): FollowUpPreset[] {
  const at = (day: Date, hour: number) => startOfHour(setHours(day, hour));
  const presets: FollowUpPreset[] = [];

  const laterToday = startOfHour(addHours(now, 2));
  if (isSameDay(laterToday, now)) {
    presets.push({ id: "later", label: `Today ${format(laterToday, "h a")}`, date: laterToday });
  }

  presets.push({ id: "tomorrow", label: "Tomorrow 10 AM", date: at(addDays(now, 1), 10) });
  presets.push({ id: "three-days", label: `${format(addDays(now, 3), "EEE")} 10 AM`, date: at(addDays(now, 3), 10) });
  presets.push({ id: "next-week", label: "Next Mon 10 AM", date: at(nextMonday(now), 10) });
  return presets;
}

/** Values for <input type="date"> and <input type="time"> in local time. */
export const toDateInput = (date: Date) => format(date, "yyyy-MM-dd");
export const toTimeInput = (date: Date) => format(date, "HH:mm");

/** Combine local date and time input values into a Date, or null if incomplete. */
export function fromInputs(dateValue: string, timeValue: string): Date | null {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const greeting = (now: Date) => {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};
