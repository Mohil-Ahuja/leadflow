"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { BellOff, Building2, Phone, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useDeleteLead, useDiscussions, useLead, useUpdateLead } from "@/lib/queries";
import { statusLabel } from "@/lib/status";
import { formatFollowUp } from "@/lib/time";
import type { DiscussionCreated, LeadStatus } from "@/lib/types";

import { FollowUpChip } from "../follow-up-chip";
import { Button } from "../ui/button";
import { Composer } from "./composer";
import { StatusSelect } from "./status-select";
import { Timeline } from "./timeline";

interface LeadDialogProps {
  leadId: number | null;
  now: Date;
  onClose: () => void;
  onChanged: (leadId: number) => void;
}

/**
 * The lead's timeline, opened over the list as a side sheet: everything said
 * so far on top, newest first, and a form at the bottom to log the next one.
 */
export function LeadDialog({ leadId, now, onClose, onChanged }: LeadDialogProps) {
  return (
    <Dialog.Root open={leadId !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-overlay fixed inset-0 z-40 bg-[var(--overlay)]" />
        <Dialog.Content
          className="anim-sheet fixed inset-y-0 right-0 z-50 flex w-full max-w-[640px] flex-col bg-surface shadow-pop focus:outline-none sm:inset-y-3 sm:right-3 sm:rounded-2xl sm:border sm:border-line"
          aria-describedby={undefined}
        >
          {leadId !== null && <LeadDialogBody key={leadId} leadId={leadId} now={now} onClose={onClose} onChanged={onChanged} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LeadDialogBody({ leadId, now, onClose, onChanged }: { leadId: number } & Omit<LeadDialogProps, "leadId">) {
  const { data: lead, error: leadError } = useLead(leadId);
  const discussions = useDiscussions(leadId);
  const updateLead = useUpdateLead(leadId);
  const deleteLead = useDeleteLead();
  const [freshId, setFreshId] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!confirmingDelete) return;
    const id = window.setTimeout(() => setConfirmingDelete(false), 4000);
    return () => window.clearTimeout(id);
  }, [confirmingDelete]);

  if (!lead) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        <Dialog.Title className="sr-only">Lead</Dialog.Title>
        {leadError ? (
          <div>
            <p className="font-medium text-ink">This lead couldn&apos;t be loaded.</p>
            <p className="mt-1 text-sm text-ink-soft">{leadError.message}</p>
            <Button variant="secondary" className="mt-4" onClick={onClose}>
              Back to leads
            </Button>
          </div>
        ) : (
          <p className="text-sm text-ink-faint">Loading…</p>
        )}
      </div>
    );
  }

  function changeStatus(status: LeadStatus) {
    const previous = lead!.status;
    updateLead.mutate(
      { status },
      {
        onSuccess: () => {
          onChanged(leadId);
          toast.success(`Moved to ${statusLabel(status)}`, {
            action: { label: "Undo", onClick: () => updateLead.mutate({ status: previous }) },
          });
        },
        onError: (error) => toast.error(`Couldn't change the status. ${error.message}`),
      },
    );
  }

  function clearFollowUp() {
    updateLead.mutate(
      { follow_up_at: null },
      {
        onSuccess: () => {
          onChanged(leadId);
          toast.success("Follow-up cleared");
        },
        onError: (error) => toast.error(`Couldn't clear the follow-up. ${error.message}`),
      },
    );
  }

  function onSaved({ discussion }: DiscussionCreated) {
    setFreshId(discussion.id);
    onChanged(leadId);
    toast.success(
      discussion.follow_up_at
        ? `Note saved. Follow-up set for ${formatFollowUp(discussion.follow_up_at, now)}`
        : "Note saved",
    );
  }

  function remove() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteLead.mutate(leadId, {
      onSuccess: () => {
        toast.success(`${lead!.name} deleted`);
        onClose();
      },
      onError: (error) => toast.error(`Couldn't delete the lead. ${error.message}`),
    });
  }

  return (
    <>
      <header className="border-b border-line px-5 pb-4 pt-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Dialog.Title className="truncate font-display text-[24px] font-semibold leading-tight text-ink">
              {lead.name}
            </Dialog.Title>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
              {lead.company && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-ink-faint" aria-hidden />
                  {lead.company}
                </span>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="tabular inline-flex items-center gap-1.5 hover:text-primary">
                  <Phone className="size-3.5 text-ink-faint" aria-hidden />
                  {lead.phone}
                </a>
              )}
            </div>
          </div>
          <Dialog.Close asChild>
            <Button variant="ghost" className="-mr-2 -mt-1 w-9 px-0" aria-label="Close">
              <X className="size-5" />
            </Button>
          </Dialog.Close>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusSelect value={lead.status} onChange={changeStatus} disabled={updateLead.isPending} />
          {lead.follow_up_at ? (
            <span className="inline-flex items-center gap-1">
              <FollowUpChip at={lead.follow_up_at} now={now} className="h-9 rounded-full px-3 text-[13px]" />
              <Button
                variant="ghost"
                size="sm"
                className="w-8 px-0"
                onClick={clearFollowUp}
                disabled={updateLead.isPending}
                aria-label="Clear follow-up"
                title="Clear follow-up"
              >
                <BellOff className="size-4" />
              </Button>
            </span>
          ) : (
            <span className="text-[13px] text-ink-faint">No follow-up scheduled</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={confirmingDelete ? "ml-auto text-overdue hover:text-overdue" : "ml-auto"}
            onClick={remove}
            disabled={deleteLead.isPending}
          >
            <Trash2 className="size-4" aria-hidden />
            {confirmingDelete ? "Click again to delete" : "Delete"}
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Timeline
          discussions={discussions.data}
          isLoading={discussions.isLoading}
          error={discussions.error}
          now={now}
          freshId={freshId}
        />
      </div>

      <Composer leadId={leadId} now={now} onSaved={onSaved} />
    </>
  );
}
