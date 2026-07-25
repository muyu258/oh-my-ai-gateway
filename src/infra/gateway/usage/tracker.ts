import { saveRequestRecord as saveUsageRecord } from "#/infra/database/request-record.repository";
import { after } from "next/server";
import type { ParsedUsage, ProtocolAdapter } from "../protocol/adapter/adapter.types";
import type { Provider } from "../provider/provider.types";
import { merge } from "es-toolkit";
import { emptyUsage } from "../protocol/adapter/adapter.helpers";

const isStreamingResponse = (response: Response): boolean =>
  response.headers.get("content-type")?.toLowerCase().includes("text/event-stream") ?? false;

const getClient = (request: Request): string | undefined =>
  request.headers.get("user-agent") ?? undefined;

const processUsageTracking = async (
  request: Request,
  response: Response,
  adapter: ProtocolAdapter,
  provider: Provider,
  startAt: Date = new Date(),
): Promise<void> => {
  let error: unknown;
  let usage: ParsedUsage = emptyUsage();

  const isStream = isStreamingResponse(response);
  const { getModel, parseStreamingResponse, parseJsonResponse, protocolType } = adapter;

  if (response.ok) {
    usage = await (isStream ? parseStreamingResponse(response) : parseJsonResponse(response));
  } else {
    error = await response.text();
  }

  await saveUsageRecord(
    merge(
      {
        name: provider.name,
        model: await getModel(request),
        client: getClient(request),
        protocolType,
        status: response.status,
        isStream,
        error,
        startAt,
        endAt: new Date(),
      },
      usage,
    ),
  );
};

export const trackUsage = (
  request: Request,
  response: Response,
  adapter: ProtocolAdapter,
  provider: Provider,
): void => {
  const startedAt = new Date();
  let clonedResponse: Response;

  try {
    clonedResponse = response.clone();
  } catch (error) {
    console.error("Failed to clone the response while tracking usage", error);
    return;
  }

  const trackingPromise = processUsageTracking(
    request,
    clonedResponse,
    adapter,
    provider,
    startedAt,
  ).catch((error) => {
    console.error(`Failed to track usage for provider '${provider.name}'`, error);
  });

  after(() => trackingPromise);
};
