import { z } from "zod";

import providersJson from "./providers.json";
import { ProtocolType } from "../protocol/protocol.types";
import type { Provider } from "./provider.types";

const providerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  models: z.array(z.string().min(1)),
  protocols: z.array(z.enum(ProtocolType)),
  baseUrl: z.url().optional(),
  providerToken: z.string().min(1),
  enabled: z.boolean(),
});

export const providers: Provider[] = z.array(providerSchema).parse(providersJson);
