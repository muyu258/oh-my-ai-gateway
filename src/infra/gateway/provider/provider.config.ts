import { z } from "zod";

import providersJson from "./providers.json";
import { ProtocolType } from "../protocol/protocol.types";
import type { Provider } from "./provider.types";

const providerSchema = z.object({
  name: z.string().min(1),
  models: z.array(z.string().min(1)),
  protocols: z.array(z.enum(ProtocolType)),
  websiteUrl: z.url().optional(),
  baseUrl: z.url().optional(),
  providerToken: z.string().min(1),
  enabled: z.boolean(),
});

export const legacyProviders: Provider[] = z.array(providerSchema).parse(providersJson);
