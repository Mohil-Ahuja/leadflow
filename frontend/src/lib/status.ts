import { LEAD_STATUSES, type LeadStatus } from "./types";

interface StatusMeta {
  label: string;
  /** Position along the pipeline (1-4); closed stages sit outside it. */
  stage: number | null;
  description: string;
}

export const STATUS_META: Record<LeadStatus, StatusMeta> = {
  new: { label: "New", stage: 1, description: "Not contacted yet" },
  contacted: { label: "Contacted", stage: 2, description: "First conversation done" },
  qualified: { label: "Qualified", stage: 3, description: "Good fit, real need" },
  proposal_sent: { label: "Proposal sent", stage: 4, description: "Waiting on their decision" },
  won: { label: "Won", stage: null, description: "Signed" },
  lost: { label: "Lost", stage: null, description: "Not moving forward" },
};

export const OPEN_STAGES = LEAD_STATUSES.filter((s) => STATUS_META[s].stage !== null);

export const statusLabel = (status: LeadStatus) => STATUS_META[status].label;

/** CSS custom property holding this status's colour, defined in globals.css. */
export const statusColorVar = (status: LeadStatus) => `var(--status-${status.replace("_", "-")})`;
