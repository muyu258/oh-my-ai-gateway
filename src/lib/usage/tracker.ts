import { after } from "next/server";

import { saveUsage } from "#/lib/database/usage.repository";
import type { ProtocolAdapter } from "../protocol/adapter/adapter.types";
import type { Provider } from "../provider/provider.types";
import { processUsageTracking } from "./tracker.core";

export const track = (
  request: Request,
  response: Response,
  adapter: ProtocolAdapter,
  provider: Provider,
  timing: { startedAt: Date; timeToFirstByteMs: number },
): void => {
  const trackingPromise = processUsageTracking(
    request,
    response,
    adapter,
    provider,
    timing,
    saveUsage,
  ).catch((error) => {
    console.error(`Failed to track usage for provider '${provider.name}'`, error);
  });

  // Persist usage after the response lifecycle without delaying the client response.
  after(() => trackingPromise);
};

export const trackUsage = track;
