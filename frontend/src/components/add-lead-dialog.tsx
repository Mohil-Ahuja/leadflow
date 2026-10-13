"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ApiError } from "@/lib/api";
import { useCreateLead } from "@/lib/queries";
import type { Lead } from "@/lib/types";

import { Button } from "./ui/button";
import { TextField } from "./ui/field";

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (lead: Lead) => void;
}

export function AddLeadDialog({ open, onOpenChange, onCreated }: AddLeadDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-overlay fixed inset-0 z-40 bg-[var(--overlay)]" />
        <Dialog.Content
          className="anim-pop fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-line bg-surface shadow-pop focus:outline-none"
          aria-describedby="add-lead-description"
        >
          {/* Mounted only while open, so every visit starts with an empty form. */}
          {open && <AddLeadForm onCancel={() => onOpenChange(false)} onCreated={onCreated} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AddLeadForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (lead: Lead) => void }) {
  const createLead = useCreateLead();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState<string>();

  const serverErrors = createLead.error instanceof ApiError ? createLead.error.fieldErrors : {};
  const generalError =
    createLead.error && Object.keys(serverErrors).length === 0 ? createLead.error.message : undefined;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Enter the lead's name");
      return;
    }
    createLead.mutate({ name, company, phone }, { onSuccess: onCreated });
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex items-start justify-between border-b border-line px-6 pb-4 pt-5">
        <div>
          <Dialog.Title className="font-display text-xl font-semibold text-ink">Add lead</Dialog.Title>
          <Dialog.Description id="add-lead-description" className="mt-0.5 text-sm text-ink-soft">
            New leads start in the <span className="font-medium text-ink">New</span> stage.
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button variant="ghost" className="-mr-2 w-9 px-0" aria-label="Close">
            <X className="size-5" />
          </Button>
        </Dialog.Close>
      </div>

      <div className="space-y-4 px-6 py-5">
        <TextField
          label="Full name"
          name="name"
          required
          autoFocus
          autoComplete="off"
          placeholder="e.g. Ananya Iyer"
          maxLength={120}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(undefined);
          }}
          error={nameError ?? serverErrors.name}
        />
        <TextField
          label="Company"
          name="company"
          autoComplete="off"
          placeholder="e.g. Kestrel Wealth Partners"
          maxLength={120}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          error={serverErrors.company}
        />
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="off"
          placeholder="e.g. +91 98200 41123"
          maxLength={40}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={serverErrors.phone}
        />
        {generalError && (
          <p role="alert" className="rounded-lg bg-overdue-tint px-3 py-2 text-sm text-overdue">
            {generalError}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={createLead.isPending}>
          {createLead.isPending ? "Adding…" : "Add lead"}
        </Button>
      </div>
    </form>
  );
}
