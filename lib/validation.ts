import { z } from "zod";
import {
  ticketCategories,
  ticketPriorities,
  ticketStatuses,
} from "@/lib/domain";

export const ticketCategorySchema = z.enum(ticketCategories);
export const ticketPrioritySchema = z.enum(ticketPriorities);
export const ticketStatusSchema = z.enum(ticketStatuses);
export const ticketReferenceSchema = z.string().regex(/^HD-[A-F0-9]{10}$/);

export const ticketCreateSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(10).max(5_000),
  category: ticketCategorySchema,
  priority: ticketPrioritySchema.default("medium"),
  contactEmail: z.union([z.string().trim().email().max(320), z.literal("")]).optional(),
  aiSummary: z.string().trim().max(2_000).optional(),
});

export const ticketCreateRequestSchema = ticketCreateSchema.extend({
  submissionKey: z.string().uuid(),
});

export const ticketPrefillSchema = z.object({
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(5_000).optional(),
  category: ticketCategorySchema.optional(),
  priority: ticketPrioritySchema.optional(),
  aiSummary: z.string().trim().max(2_000).optional(),
});

export const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4_000),
});

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  history: z.array(assistantMessageSchema).max(12).default([]),
});

export const assistantResponseSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  category: ticketCategorySchema,
  priority: ticketPrioritySchema,
  clarifyingQuestion: z.string().trim().max(500).nullable(),
  steps: z.array(z.string().trim().min(1).max(800)).min(1).max(8),
  caution: z.string().trim().max(800).nullable(),
  escalationRecommendation: z.string().trim().min(1).max(800),
});

export const adminTicketUpdateSchema = z
  .object({
    status: ticketStatusSchema.optional(),
    priority: ticketPrioritySchema.optional(),
  })
  .refine((value) => value.status !== undefined || value.priority !== undefined, {
    message: "At least one field must be updated.",
  });

export const adminTicketFiltersSchema = z.object({
  query: z.string().trim().max(120).optional(),
  status: ticketStatusSchema.optional(),
  category: ticketCategorySchema.optional(),
  priority: ticketPrioritySchema.optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "priority"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const staffLoginSchema = z.object({
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
});

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
export type TicketCreateRequest = z.infer<typeof ticketCreateRequestSchema>;
export type TicketPrefill = z.infer<typeof ticketPrefillSchema>;
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
export type AdminTicketUpdate = z.infer<typeof adminTicketUpdateSchema>;
export type AdminTicketFilters = z.infer<typeof adminTicketFiltersSchema>;
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
