import { z } from "zod";

import providersJson from "./providers.json";
import { ProtocolType } from "../protocol/protocol.types";
import type { NewProviderRecord } from "#/infra/database/drizzle/schema";

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

export const legacyProviders: NewProviderRecord[] = z
  .array(providerSchema)
  .parse(providersJson)
  .map(({ protocols, providerToken, ...provider }) => ({
    ...provider,
    protocols: Object.fromEntries(
      protocols.map((protocol) => [protocol, { endpoint: "", enabled: true }]),
    ),
    token: providerToken,
  }));
