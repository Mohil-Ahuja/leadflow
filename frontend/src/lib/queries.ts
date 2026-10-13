"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { api, type LeadFilters } from "./api";
import type { Lead, LeadList, LeadPatch, NewDiscussion, NewLead } from "./types";

export const keys = {
  leads: ["leads"] as const,
  leadList: (filters: LeadFilters) => ["leads", "list", filters] as const,
  lead: (leadId: number) => ["leads", "detail", leadId] as const,
  discussions: (leadId: number) => ["leads", leadId, "discussions"] as const,
};

/** Swap the updated lead into every cached list so the UI reflects it instantly. */
function patchLeadInLists(client: QueryClient, lead: Lead) {
  client.setQueryData(keys.lead(lead.id), lead);
  client.setQueriesData<LeadList>({ queryKey: ["leads", "list"] }, (list) =>
    list ? { ...list, items: list.items.map((item) => (item.id === lead.id ? lead : item)) } : list,
  );
}

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: keys.leadList(filters),
    queryFn: () => api.listLeads(filters),
    placeholderData: (previous) => previous,
  });
}

/** A single lead, seeded from whichever list already holds it so the dialog opens instantly. */
export function useLead(leadId: number | null) {
  const client = useQueryClient();
  return useQuery({
    queryKey: keys.lead(leadId ?? -1),
    queryFn: () => api.getLead(leadId!),
    enabled: leadId !== null,
    initialData: () => {
      for (const [, list] of client.getQueriesData<LeadList>({ queryKey: ["leads", "list"] })) {
        const match = list?.items.find((item) => item.id === leadId);
        if (match) return match;
      }
      return undefined;
    },
  });
}

export function useDiscussions(leadId: number | null) {
  return useQuery({
    queryKey: keys.discussions(leadId ?? -1),
    queryFn: () => api.listDiscussions(leadId!),
    enabled: leadId !== null,
  });
}

export function useCreateLead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: NewLead) => api.createLead(data),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.leads }),
  });
}

export function useUpdateLead(leadId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: LeadPatch) => api.updateLead(leadId, patch),
    onSuccess: (lead) => {
      patchLeadInLists(client, lead);
      // Status changes add a timeline entry and move counts, so refetch both.
      client.invalidateQueries({ queryKey: keys.leads });
    },
  });
}

export function useAddDiscussion(leadId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: NewDiscussion) => api.addDiscussion(leadId, data),
    onSuccess: ({ lead }) => {
      patchLeadInLists(client, lead);
      client.invalidateQueries({ queryKey: keys.leads });
    },
  });
}

export function useDeleteLead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (leadId: number) => api.deleteLead(leadId),
    // Only the lists: refetching the deleted lead itself would just 404.
    onSuccess: () => client.invalidateQueries({ queryKey: ["leads", "list"] }),
  });
}
