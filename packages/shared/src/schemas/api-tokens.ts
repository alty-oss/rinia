import { z } from "zod";

/** Every API token starts with this, so a leaked one is easy to recognize and search for. */
export const API_TOKEN_PREFIX = "rinia_";

export const createApiTokenSchema = z.object({ name: z.string().trim().min(1).max(80) }).strict();
export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;
