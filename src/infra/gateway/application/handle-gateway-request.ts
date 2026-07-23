import { pipe } from "es-toolkit/fp";
import { after } from "next/server";
import { forEnabled, forModel, forProtocol, selectProvider } from "../provider/provider.helpers";
import { providers } from "../provider/provider.config";
import { collectResponse } from "../protocol/adapter/adapter.helpers";
import type {
  CollectedResponse,
  ProtocolAdapter,
  ResponseAdapter,
} from "../protocol/adapter/adapter.types";
import { normalizeGatewayError } from "../errors/gateway-error";
import { authByToken } from "#/auth/auth";
import { saveRequestRecord } from "#/infra/database/request-record.repository";
import type { NewRequestRecord } from "#/infra/database/drizzle/schema";

const recordGatewayResponse = async (
  record: NewRequestRecord,
  collectedResponse: CollectedResponse,
  extractResponseMetadata: ResponseAdapter["extractResponseMetadata"],
): Promise<void> => {
  let error: unknown;
  let metadata = {};

  const { forwardedResponse, completion, timeToFirstByteMs, isStream } = collectedResponse;
  const [responseCompletion, recordedTimeToFirstByteMs] = await Promise.all([
    completion,
    timeToFirstByteMs,
  ]);

  if (responseCompletion.type === "completed") {
    metadata = extractResponseMetadata(responseCompletion.payload);
  } else if (responseCompletion.type === "failed") {
    error = responseCompletion.error;
  } else {
    error = responseCompletion.reason;
  }

  const completedRequestRecord: NewRequestRecord = {
    ...record,
    ...metadata,
    status: String(forwardedResponse.status),
    isStream,
    timeToFirstByteMs: recordedTimeToFirstByteMs,
    endAt: new Date(),
    error,
  };

  try {
    await saveRequestRecord(completedRequestRecord);
  } catch (saveError) {
    console.error("Failed to save gateway request record", saveError);
  }
};

export const handleGatewayRequest = async ({
  request,
  adapter: {
    requestAdapter: { getGatewayToken, getModel, requestTransformer },
    responseAdapter: { createErrorResponse, createSseResponseCollector, extractResponseMetadata },
    protocolType,
  },
}: {
  request: Request;
  adapter: ProtocolAdapter;
}): Promise<Response> => {
  const requestStartedAt = performance.now();
  let gatewayResponse: Response;
  let requestRecord: NewRequestRecord = {
    client: request.headers.get("user-agent") ?? undefined,
    startAt: new Date(),
  };

  try {
    pipe(request, getGatewayToken, authByToken);
    const model = await getModel(request);
    const {
      id: channelId,
      baseUrl,
      providerToken,
    } = pipe(providers, forEnabled, forProtocol(protocolType), forModel(model), selectProvider);
    requestRecord = {
      ...requestRecord,
      model,
      protocolType,
      channelId,
    };
    const upstreamRequest = requestTransformer({
      request,
      options: {
        baseUrl,
        providerToken,
      },
    });

    gatewayResponse = await fetch(upstreamRequest);
  } catch (error) {
    gatewayResponse = pipe(error, normalizeGatewayError, createErrorResponse);
  }

  const collectedResponse = collectResponse(gatewayResponse, createSseResponseCollector, {
    startedAt: requestStartedAt,
  });

  after(() => recordGatewayResponse(requestRecord, collectedResponse, extractResponseMetadata));

  return collectedResponse.forwardedResponse;
};
