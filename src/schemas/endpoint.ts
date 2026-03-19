import { z } from "zod";

export const EndpointSchema = z.object({
  apiId: z.number(),
  name: z.string().min(1),
  path: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  groupName: z.string().optional(),
  isFavorite: z.boolean().optional()
});
