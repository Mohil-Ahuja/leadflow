"use client";

import { RefreshCw, SearchX, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useDebouncedValue, useHotkey, useNow } from "@/lib/hooks";
import { useLeads } from "@/lib/queries";
import { statusLabel } from "@/lib/status";
import { greeting, groupLeads } from "@/lib/time";
import type { Lead, LeadStatus } from "@/lib/types";

import { AddLeadDialog } from "./add-lead-dialog";
import { Agenda, SectionHeading } from "./agenda";
import { Header } from "./header";
import { LeadDialog } from "./lead-dialog/lead-dialog";
import { LeadRow } from "./lead-row";
import { PipelineFilter } from "./pipeline-filter";
import { SearchBox } from "./search-box";
import { Button } from "./ui/button";

export function LeadFlowApp() {
  const now = useNow();
  const [status, setStatus] = useState<LeadStatus | null>(null);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search);
  const [openLeadId, setOpenLeadId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const leads = useLeads({ status, q });
  const grouped = useMemo(() => groupLeads(leads.data?.items ?? [], now), [leads.data, now]);

  useHotkey("/", useCallback(() => searchRef.current?.focus(), []));
  useHotkey("n", useCallback(() => setAddOpen(true), []));

  useEffect(() => {
    if (highlightedId === null) return;
    const id = window.setTimeout(() => setHighlightedId(null), 1800);
    return () => window.clearTimeout(id);
  }, [highlightedId]);

  const openLead = useCallback((lead: Lead) => setOpenLeadId(lead.id), []);
  const filtering = status !== null || q.trim() !== "";

  function onLeadCreated(lead: Lead) {
    setAddOpen(false);
    setHighlightedId(lead.id);
    // Make sure the new lead is visible rather than hidden by a filter.
    if (status !== null && status !== lead.status) setStatus(null);
    if (q && !lead.name.toLowerCase().includes(q.toLowerCase())) setSearch("");
    toast.success(`${lead.name} added`, {
      action: { label: "Log a note", onClick: () => setOpenLeadId(lead.id) },
    });
  }

  return (
    <>
      <Header onAddLead={() => setAddOpen(true)} />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
        <Headline
          loading={leads.isPending}
          now={now}
          dueLater={grouped.today.filter((l) => new Date(l.follow_up_at!) > now).length}
          overdue={grouped.overdue.length + grouped.today.filter((l) => new Date(l.follow_up_at!) <= now).length}
          filtering={filtering}
        />

        <div className="mt-7 flex min-w-0 flex-col gap-4 sm:mt-8">
          <div className="sm:max-w-md">
            <SearchBox ref={searchRef} value={search} onChange={setSearch} />
          </div>
          <PipelineFilter counts={leads.data?.status_counts} value={status} onChange={setStatus} />
        </div>

        <div className="mt-8 space-y-8">
          {leads.isPending ? (
            <ListSkeleton />
          ) : leads.isError ? (
            <ErrorState message={leads.error.message} onRetry={() => leads.refetch()} />
          ) : leads.data.items.length === 0 ? (
            <EmptyState
              filtering={filtering}
              status={status}
              q={q}
              onClear={() => {
                setStatus(null);
                setSearch("");
              }}
              onAdd={() => setAddOpen(true)}
            />
          ) : (
            <>
              <Agenda
                today={grouped.today}
                overdue={grouped.overdue}
                now={now}
                onOpen={openLead}
                highlightedId={highlightedId}
              />
              {grouped.rest.length > 0 && (
                <section aria-labelledby="all-heading">
                  <SectionHeading
                    id="all-heading"
                    title={status ? statusLabel(status) : grouped.rest.length === leads.data.items.length ? "All leads" : "Everyone else"}
                    count={grouped.rest.length}
                  />
                  <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                    {grouped.rest.map((lead) => (
                      <li key={lead.id}>
                        <LeadRow lead={lead} now={now} onOpen={openLead} highlighted={lead.id === highlightedId} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <LeadDialog leadId={openLeadId} now={now} onClose={() => setOpenLeadId(null)} onChanged={setHighlightedId} />
      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onCreated={onLeadCreated} />
    </>
  );
}

/** The day at a glance, written as a sentence: what a rep wants to know first. */
function Headline({
  loading,
  now,
  dueLater,
  overdue,
  filtering,
}: {
  loading: boolean;
  now: Date;
  dueLater: number;
  overdue: number;
  filtering: boolean;
}) {
  if (loading) return <div className="h-[76px] max-w-lg animate-pulse rounded-lg bg-line/60" aria-hidden />;

  const scope = filtering ? " in this view" : "";
  let summary: React.ReactNode;
  if (dueLater === 0 && overdue === 0) {
    summary = <>Nothing left to follow up today{scope}. A good day to reach out to someone new.</>;
  } else {
    summary = (
      <>
        {dueLater > 0 && (
          <>
            <span className="text-due">
              {dueLater} follow-up{dueLater === 1 ? "" : "s"}
            </span>{" "}
            left today
          </>
        )}
        {dueLater > 0 && overdue > 0 && " and "}
        {overdue > 0 && <span className="text-overdue">{overdue} overdue</span>}
        {scope}.
      </>
    );
  }

  return (
    <div>
      <p className="tabular text-[15px] text-ink-soft">
        {greeting(now)}. It&apos;s {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}.
      </p>
      <h1 className="mt-1.5 max-w-2xl text-balance font-display text-[30px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-[38px]">
        {summary}
      </h1>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface" aria-busy="true" aria-label="Loading leads">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2.5 border-b border-line px-5 py-4 last:border-b-0">
          <div className="h-4 w-48 animate-pulse rounded bg-line" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-sunken" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-overdue-line bg-overdue-tint px-6 py-8 text-center">
      <p className="font-display text-lg font-semibold text-ink">Leads couldn&apos;t be loaded</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{message}</p>
      <Button variant="secondary" className="mt-4" onClick={onRetry}>
        <RefreshCw className="size-4" aria-hidden />
        Try again
      </Button>
    </div>
  );
}

function EmptyState({
  filtering,
  status,
  q,
  onClear,
  onAdd,
}: {
  filtering: boolean;
  status: LeadStatus | null;
  q: string;
  onClear: () => void;
  onAdd: () => void;
}) {
  if (filtering) {
    const what = [status && `in ${statusLabel(status)}`, q && `matching “${q}”`].filter(Boolean).join(" ");
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
        <SearchX className="mx-auto size-8 text-ink-faint" aria-hidden />
        <p className="mt-3 font-display text-lg font-semibold text-ink">No leads {what}</p>
        <p className="mt-1 text-sm text-ink-soft">Try another stage or spelling, or clear the filters to see everyone.</p>
        <Button variant="secondary" className="mt-4" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
      <UserPlus className="mx-auto size-8 text-ink-faint" aria-hidden />
      <p className="mt-3 font-display text-lg font-semibold text-ink">Add your first lead</p>
      <p className="mt-1 text-sm text-ink-soft">Log every conversation and LeadFlow will remind you when to follow up.</p>
      <Button className="mt-4" onClick={onAdd}>
        Add lead
      </Button>
    </div>
  );
}
