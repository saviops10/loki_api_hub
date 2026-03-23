import { z } from "zod";

export const ProxyRequestSchema = z.object({
  apiId: z.number().int().positive(),
  endpointId: z.number().int().positive(),
  body: z.any().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  params: z.record(z.string(), z.string()).optional(),
});

export type ProxyRequest = z.infer<typeof ProxyRequestSchema>;
