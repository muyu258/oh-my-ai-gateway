import { invariant } from "es-toolkit";
import { pipe } from "es-toolkit/fp";
import { getProviders } from "#/lib/database/provider.repository";
import type { ProtocolAdapter } from "./protocol/adapter/adapter.types";
import { GatewayError, GatewayErrorCode, normalizeGatewayError } from "./errors/gateway-error";
import { authByToken } from "#/lib/auth/auth";
import { track } from "./usage/tracker";
import { forwardResponse } from "./proxy/proxy.helpers";

export const requestHandler = async ({
  request,
  adapter,
}: {
  request: Request;
  adapter: ProtocolAdapter;
}): Promise<Response> => {
  const { getModel, getToken, protocolType, transformer, createErrorResponse } = adapter;
  const startedAt = new Date();

  try {
    pipe(request, getToken, authByToken);
    // Forwarding and usage parsing may consume bodies, so each path owns a separate stream branch.
    const trackingRequest = request.clone();

    const model = await getModel(request);
    const providers = await getProviders();
    const matchingProviders = providers.filter(
      (provider) =>
        provider.enabled &&
        provider.protocols[protocolType]?.enabled &&
        provider.models.includes(model),
    );
    const providerId = request.headers.get("x-provider-id");
    const provider = providerId
      ? matchingProviders.find(({ id }) => id === providerId)
      : matchingProviders.at(0);
    invariant(
      provider,
      new GatewayError(
        GatewayErrorCode.RouteNotFound,
        "No provider matches this protocol and model",
      ),
    );
    const { baseUrl, token, protocols } = provider;
    const endpoint = protocols[protocolType]?.endpoint?.trim() || adapter.defaultEndpoint;

    const providerRequestStartedAt = performance.now();
    const upstreamResponse = await fetch(
      transformer({
        request,
        options: {
          baseUrl,
          model,
          endpoint,
          token,
        },
      }),
    );
    const timeToFirstByteMs = Math.max(0, Math.round(performance.now() - providerRequestStartedAt));
    const trackingResponse = upstreamResponse.clone();

    track(trackingRequest, trackingResponse, adapter, provider, model, {
      startedAt,
      timeToFirstByteMs,
    });
    return forwardResponse(upstreamResponse);
  } catch (error) {
    console.error("error:", error);
    return pipe(error, normalizeGatewayError, createErrorResponse);
  }
};
