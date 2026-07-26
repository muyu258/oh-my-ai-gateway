import { after } from "next/server";

import type { NewUsage } from "#/lib/database/drizzle/schema";
import { saveUsage } from "#/lib/database/usage.repository";
import { calculateCost } from "#/lib/pricing/calculate-cost";
import { emptyUsage } from "../protocol/adapter/adapter.helpers";
import type { ParsedUsage, ProtocolAdapter } from "../protocol/adapter/adapter.types";
import type { Provider } from "../provider/provider.types";

const isStreamingResponse = (response: Response): boolean =>
  response.headers.get("content-type")?.toLowerCase().includes("text/event-stream") ?? false;

const getClient = (request: Request): string | undefined =>
  request.headers.get("user-agent") ?? undefined;

const parseErrorBody = (body: string): unknown => {
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

const processUsageTracking = async (
  request: Request,
  response: Response,
  adapter: ProtocolAdapter,
  provider: Provider,
  requestedModel: string,
  upstreamModel: string,
  timing: { startedAt: Date; timeToFirstByteMs: number },
): Promise<void> => {
  const id = crypto.randomUUID();
  const isStream = isStreamingResponse(response);
  const { parseStreamingResponse, parseJsonResponse, protocolType } = adapter;

  let usage: ParsedUsage = emptyUsage();
  let error: unknown;
  try {
    if (response.ok) {
      usage = await (isStream
        ? parseStreamingResponse(response.clone())
        : parseJsonResponse(response.clone()));
    } else {
      error = parseErrorBody(await response.clone().text());
    }
  } catch (parseError) {
    error = parseError;
  }

  let cost: Pick<NewUsage, "costMicros" | "costStatus" | "costSnapshot" | "pricingSource">;
  try {
    cost = calculateCost(upstreamModel, provider, usage);
  } catch (costError) {
    console.error(`Failed to calculate usage cost for provider '${provider.name}'`, costError);
    cost = {
      costMicros: null,
      costStatus: "error",
      costSnapshot: undefined,
      pricingSource: null,
    };
  }

  await saveUsage({
    id,
    providerId: provider.id,
    model: requestedModel,
    upstreamModel,
    client: getClient(request),
    protocolType,
    status: response.status,
    isStream,
    error,
    startAt: timing.startedAt,
    timeToFirstByteMs: timing.timeToFirstByteMs,
    endAt: new Date(),
    ...cost,
    ...usage,
  });
};

export const track = (
  request: Request,
  response: Response,
  adapter: ProtocolAdapter,
  provider: Provider,
  requestedModel: string,
  upstreamModel: string,
  timing: { startedAt: Date; timeToFirstByteMs: number },
): void => {
  const trackingPromise = processUsageTracking(
    request,
    response,
    adapter,
    provider,
    requestedModel,
    upstreamModel,
    timing,
  ).catch((error) => {
    console.error(`Failed to track usage for provider '${provider.name}'`, error);
  });

  // Persist usage after the response lifecycle without delaying the client response.
  after(() => trackingPromise);
};
