"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

import { STATUS_META, statusColorVar, statusLabel } from "@/lib/status";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

interface StatusSelectProps {
  value: LeadStatus;
  onChange: (status: LeadStatus) => void;
  disabled?: boolean;
}

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  const color = statusColorVar(value);
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as LeadStatus)} disabled={disabled}>
      <Select.Trigger
        aria-label="Lead status"
        className="inline-flex h-9 items-center gap-2 rounded-full border pl-3 pr-2.5 text-[14px] font-medium transition-colors disabled:opacity-60"
        style={{
          color,
          borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
        }}
      >
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <Select.Value>{statusLabel(value)}</Select.Value>
        <Select.Icon>
          <ChevronDown className="size-4" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          align="end"
          className="anim-pop z-[60] min-w-[240px] overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop"
        >
          <Select.Viewport>
            {LEAD_STATUSES.map((status) => (
              <Select.Item
                key={status}
                value={status}
                className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg py-2 pl-3 pr-8 text-[14px] text-ink outline-none data-[highlighted]:bg-sunken"
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: statusColorVar(status) }} aria-hidden />
                <span className="flex flex-col">
                  <Select.ItemText>{statusLabel(status)}</Select.ItemText>
                  <span className="text-[12.5px] text-ink-faint">{STATUS_META[status].description}</span>
                </span>
                <Select.ItemIndicator className="absolute right-2.5">
                  <Check className="size-4 text-primary" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
