import { after } from "next/server";
import { merge } from "es-toolkit";

import { saveUsage, saveUsageContent } from "#/lib/database/usage.repository";
import { emptyUsage } from "../protocol/adapter/adapter.helpers";
import type { ParsedUsage, ProtocolAdapter } from "../protocol/adapter/adapter.types";
import type { Provider } from "../provider/provider.types";

const isStreamingResponse = (response: Response): boolean =>
  response.headers.get("content-type")?.toLowerCase().includes("text/event-stream") ?? false;

const getClient = (request: Request): string | undefined =>
  request.headers.get("user-agent") ?? undefined;

const readText = async (body: Request | Response): Promise<string> => body.clone().text();

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
  startAt: Date = new Date(),
): Promise<void> => {
  const id = crypto.randomUUID();
  const isStream = isStreamingResponse(response);
  const { getModel, parseStreamingResponse, parseJsonResponse, protocolType } = adapter;
  const requestBodyPromise = readText(request);
  const responseBodyPromise = readText(response);

  let usage: ParsedUsage = emptyUsage();
  let error: unknown;
  try {
    if (response.ok) {
      usage = await (isStream
        ? parseStreamingResponse(response.clone())
        : parseJsonResponse(response.clone()));
    } else {
      error = parseErrorBody(await responseBodyPromise);
    }
  } catch (parseError) {
    error = parseError;
  }

  const record = merge(
    {
      id,
      name: provider.name,
      model: await getModel(request.clone()),
      client: getClient(request),
      protocolType,
      status: response.status,
      isStream,
      error,
      startAt,
      endAt: new Date(),
    },
    usage,
  );

  await saveUsage(record);

  try {
    const [requestBody, responseBody] = await Promise.all([
      requestBodyPromise,
      responseBodyPromise,
    ]);
    await saveUsageContent({
      usageId: id,
      requestBody,
      responseBody,
      createdAt: new Date(),
    });
  } catch (contentError) {
    console.error(`Failed to store usage content for provider '${provider.name}'`, contentError);
  }
};

export const track = (
  request: Request,
  response: Response,
  adapter: ProtocolAdapter,
  provider: Provider,
  startedAt: Date,
): void => {
  const trackingPromise = processUsageTracking(
    request,
    response,
    adapter,
    provider,
    startedAt,
  ).catch((error) => {
    console.error(`Failed to track usage for provider '${provider.name}'`, error);
  });

  after(() => trackingPromise);
};

export const trackUsage = track;
