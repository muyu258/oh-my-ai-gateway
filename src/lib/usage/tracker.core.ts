import { merge } from "es-toolkit";

import type { NewUsage } from "#/lib/database/drizzle/schema";
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

export const processUsageTracking = async (
  request: Request,
  response: Response,
  adapter: ProtocolAdapter,
  provider: Provider,
  timing: { startedAt: Date; timeToFirstByteMs: number },
  persistUsage: (record: NewUsage) => Promise<void>,
): Promise<void> => {
  const id = crypto.randomUUID();
  const isStream = isStreamingResponse(response);
  const { getModel, parseStreamingResponse, parseJsonResponse, protocolType } = adapter;

  let usage: ParsedUsage = emptyUsage();
  let error: unknown;
  try {
    if (response.ok) {
      // Parsers consume their input; this clone leaves the client-facing response stream intact.
      usage = await (isStream
        ? parseStreamingResponse(response.clone())
        : parseJsonResponse(response.clone()));
    } else {
      error = parseErrorBody(await response.clone().text());
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
      startAt: timing.startedAt,
      timeToFirstByteMs: timing.timeToFirstByteMs,
      endAt: new Date(),
    },
    usage,
  );

  await persistUsage(record);
};
