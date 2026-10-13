export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal_sent", "won", "lost"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface NotePreview {
  id: number;
  note: string;
  created_at: string;
}

export interface Lead {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  last_note: NotePreview | null;
  discussion_count: number;
}

export interface LeadList {
  items: Lead[];
  total: number;
  status_counts: Record<LeadStatus, number>;
}

export interface Discussion {
  id: number;
  lead_id: number;
  note: string;
  kind: "note" | "system";
  follow_up_at: string | null;
  created_at: string;
}

export interface DiscussionCreated {
  discussion: Discussion;
  lead: Lead;
}

export interface NewLead {
  name: string;
  company?: string;
  phone?: string;
}

export interface LeadPatch {
  name?: string;
  company?: string | null;
  phone?: string | null;
  status?: LeadStatus;
  follow_up_at?: string | null;
}

export interface NewDiscussion {
  note: string;
  follow_up_at?: string | null;
}
