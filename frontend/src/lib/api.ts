import type {
  Discussion,
  DiscussionCreated,
  Lead,
  LeadList,
  LeadPatch,
  LeadStatus,
  NewDiscussion,
  NewLead,
} from "./types";

interface ErrorEnvelope {
  error?: { code: string; message: string; details?: { field: string; message: string }[] | null };
}

/** An API failure carrying the backend's error code and per-field messages. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "network_error", "Can't reach the LeadFlow server. Check that the API is running.");
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as ErrorEnvelope | null)?.error;
    const fieldErrors = Object.fromEntries((error?.details ?? []).map((d) => [d.field, d.message]));
    throw new ApiError(
      response.status,
      error?.code ?? "unknown_error",
      error?.message ?? `Request failed (${response.status})`,
      fieldErrors,
    );
  }
  return body as T;
}

export interface LeadFilters {
  status?: LeadStatus | null;
  q?: string;
}

export const api = {
  listLeads({ status, q }: LeadFilters): Promise<LeadList> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q?.trim()) params.set("q", q.trim());
    const query = params.toString();
    return request(`/api/leads${query ? `?${query}` : ""}`);
  },
  getLead: (id: number) => request<Lead>(`/api/leads/${id}`),
  createLead: (data: NewLead) => request<Lead>("/api/leads", { method: "POST", body: JSON.stringify(data) }),
  updateLead: (id: number, data: LeadPatch) =>
    request<Lead>(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteLead: (id: number) => request<void>(`/api/leads/${id}`, { method: "DELETE" }),
  listDiscussions: (leadId: number) => request<Discussion[]>(`/api/leads/${leadId}/discussions`),
  addDiscussion: (leadId: number, data: NewDiscussion) =>
    request<DiscussionCreated>(`/api/leads/${leadId}/discussions`, { method: "POST", body: JSON.stringify(data) }),
};
