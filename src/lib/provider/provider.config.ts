import { readFileSync } from "node:fs";
import { z } from "zod";

import { ProtocolType } from "../protocol/protocol.types";
import type { NewProviderRecord } from "#/lib/database/drizzle/schema";

const providerSchema = z.object({
  name: z.string().min(1),
  models: z.array(z.string().min(1)),
  testModel: z.string().min(1).optional(),
  protocols: z.array(z.enum(ProtocolType)),
  websiteUrl: z.url().optional(),
  baseUrl: z.url().optional(),
  providerToken: z.string().min(1),
  enabled: z.boolean(),
});

const loadLegacyProviders = (): unknown => {
  try {
    return JSON.parse(readFileSync(new URL("./providers.json", import.meta.url), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
};

export const legacyProviders: NewProviderRecord[] = z
  .array(providerSchema)
  .parse(loadLegacyProviders())
  .map(({ protocols, providerToken, ...provider }) => ({
    ...provider,
    protocols: Object.fromEntries(
      protocols.map((protocol) => [protocol, { endpoint: "", enabled: true }]),
    ),
    token: providerToken,
  }));
