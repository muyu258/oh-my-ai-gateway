import { pipe } from "es-toolkit/fp";
import { after } from "next/server";
import {
  forEnabled,
  forModel,
  forName,
  forProtocol,
  selectProvider,
} from "../provider/provider.helpers";
import { getProviders } from "#/infra/database/provider.repository";
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
import { getResponseRecordFields } from "./response-record.helpers";

const recordGatewayResponse = async (
  record: NewRequestRecord,
  collectedResponse: CollectedResponse,
  extractResponseMetadata: ResponseAdapter["extractResponseMetadata"],
): Promise<void> => {
  const { forwardedResponse, completion, timeToFirstByteMs, isStream } = collectedResponse;
  const [responseCompletion, recordedTimeToFirstByteMs] = await Promise.all([
    completion,
    timeToFirstByteMs,
  ]);
  const { metadata, error } = getResponseRecordFields(
    forwardedResponse.status,
    responseCompletion,
    extractResponseMetadata,
  );

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
    const providers = await getProviders();
    const requestedProviderName = request.headers.get("x-provider-name");
    const matchingProviders = pipe(
      providers,
      forEnabled,
      forProtocol(protocolType),
      forModel(model),
    );
    const eligibleProviders = requestedProviderName
      ? pipe(matchingProviders, forName(requestedProviderName))
      : matchingProviders;
    const { name, baseUrl, providerToken, protocolEndpoints } = pipe(
      eligibleProviders,
      selectProvider,
    );
    requestRecord = {
      ...requestRecord,
      model,
      protocolType,
      name,
    };
    const upstreamRequest = requestTransformer({
      request,
      options: {
        baseUrl,
        endpoint: protocolEndpoints?.[protocolType],
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
