export const ticketCategories = [
  "network_connectivity",
  "software_applications",
  "hardware_devices",
  "account_access",
  "performance",
  "security_concern",
  "other",
] as const;

export const ticketPriorities = ["low", "medium", "high", "urgent"] as const;

export const ticketStatuses = [
  "open",
  "in_progress",
  "waiting_on_user",
  "resolved",
  "closed",
] as const;

export type TicketCategory = (typeof ticketCategories)[number];
export type TicketPriority = (typeof ticketPriorities)[number];
export type TicketStatus = (typeof ticketStatuses)[number];

export type TicketSummaryDTO = {
  id: string;
  reference: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};

export type PublicTicketDTO = TicketSummaryDTO & {
  description: string;
  aiSummary: string | null;
};

export type AdminTicketDTO = PublicTicketDTO & {
  contactEmail: string | null;
  events: Array<{
    eventType: "created" | "status_changed" | "priority_changed";
    fromStatus: TicketStatus | null;
    toStatus: TicketStatus | null;
    fromPriority: TicketPriority | null;
    toPriority: TicketPriority | null;
    actorName: string | null;
    createdAt: string;
  }>;
};
