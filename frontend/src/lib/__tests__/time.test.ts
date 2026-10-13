import { describe, expect, it } from "vitest";

import { followUpPresets, followUpState, formatFollowUp, fromInputs, groupLeads, timeAgo } from "../time";
import type { Lead } from "../types";

// Local-time "now": 13 Oct 2026, 2:30 PM (a Tuesday).
const now = new Date(2026, 9, 13, 14, 30);
const at = (day: number, hour: number, minute = 0, second = 0) =>
  new Date(2026, 9, day, hour, minute, second).toISOString();

function lead(id: number, follow_up_at: string | null): Lead {
  return {
    id,
    name: `Lead ${id}`,
    company: null,
    phone: null,
    status: "new",
    follow_up_at,
    created_at: at(1, 9),
    updated_at: at(1, 9),
    last_note: null,
    discussion_count: 0,
  };
}

describe("groupLeads", () => {
  it("pins today's follow-ups earliest first, including ones whose time has passed", () => {
    const leads = [lead(1, at(13, 17)), lead(2, at(13, 9)), lead(3, at(13, 23, 59)), lead(4, at(13, 0, 0))];
    expect(groupLeads(leads, now).today.map((l) => l.id)).toEqual([4, 2, 1, 3]);
  });

  it("separates follow-ups from previous days as overdue", () => {
    const { today, overdue, rest } = groupLeads([lead(1, at(12, 23, 59)), lead(2, at(10, 9))], now);
    expect(today).toEqual([]);
    expect(overdue.map((l) => l.id)).toEqual([2, 1]);
    expect(rest).toEqual([]);
  });

  it("leaves future and missing follow-ups in the main list, in API order", () => {
    const leads = [lead(1, null), lead(2, at(14, 0, 0)), lead(3, at(20, 10))];
    const { today, overdue, rest } = groupLeads(leads, now);
    expect(today).toEqual([]);
    expect(overdue).toEqual([]);
    expect(rest.map((l) => l.id)).toEqual([1, 2, 3]);
  });
});

describe("followUpState", () => {
  it("is overdue once the time has passed, even earlier today", () => {
    expect(followUpState(at(13, 14, 0), now)).toBe("overdue");
    expect(followUpState(at(13, 15, 0), now)).toBe("today");
    expect(followUpState(at(14, 9, 0), now)).toBe("upcoming");
  });
});

describe("formatting", () => {
  it("describes follow-ups relative to today", () => {
    expect(formatFollowUp(at(13, 16), now)).toBe("Today, 4:00 PM");
    expect(formatFollowUp(at(14, 10), now)).toBe("Tomorrow, 10:00 AM");
    expect(formatFollowUp(at(12, 10), now)).toBe("Yesterday, 10:00 AM");
    expect(formatFollowUp(at(16, 10), now)).toBe("Friday, 10:00 AM");
    expect(formatFollowUp(at(28, 10), now)).toBe("28 Oct, 10:00 AM");
  });

  it("gives a short time-ago", () => {
    expect(timeAgo(at(13, 14, 29, 30), now)).toBe("just now");
    expect(timeAgo(at(13, 12, 0), now)).toBe("2 hours ago");
    expect(timeAgo(at(11, 14, 30), now)).toBe("2 days ago");
  });
});

describe("follow-up inputs", () => {
  it("offers later today only while there is time left", () => {
    expect(followUpPresets(now).map((p) => p.label)).toEqual([
      "Today 4 PM",
      "Tomorrow 10 AM",
      "Fri 10 AM",
      "Next Mon 10 AM",
    ]);
    const lateEvening = new Date(2026, 9, 13, 22, 30);
    expect(followUpPresets(lateEvening)[0].label).toBe("Tomorrow 10 AM");
  });

  it("combines date and time inputs in local time", () => {
    expect(fromInputs("2026-10-14", "09:15")?.toISOString()).toBe(new Date(2026, 9, 14, 9, 15).toISOString());
    expect(fromInputs("2026-10-14", "")).toBeNull();
  });
});
