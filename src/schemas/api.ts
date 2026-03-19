import { z } from "zod";

export const ApiSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  authType: z.enum(['none', 'apikey', 'oauth2', 'basic']),
  authConfig: z.record(z.string(), z.any()).optional(),
  authEndpoint: z.string().optional(),
  authUsername: z.string().optional(),
  authPassword: z.string().optional(),
  authPayloadTemplate: z.string().optional()
});
