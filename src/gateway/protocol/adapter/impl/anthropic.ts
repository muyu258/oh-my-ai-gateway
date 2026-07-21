import { invariant } from "es-toolkit";
import { collectModels } from "#/gateway/provider/provider.helpers";
import { GatewayErrorCode } from "#/gateway/errors/gateway-error";
import { ProtocolType } from "../../protocol.types";
import { appendEndpoint, withProviderHeaders } from "../adapter.helpers";
import type { ProtocolAdapter, RequestAdapter, ResponseAdapter } from "../adapter.types";
import { z } from "zod";

const defaultEndpoint = "/v1/messages";
const defaultBaseUrl = "https://api.anthropic.com";
const protocolType = ProtocolType.Anthropic;

const requestSchema = z.object({ model: z.string().min(1) });

const errorTypeByCode: Record<GatewayErrorCode, string> = {
  [GatewayErrorCode.InvalidRequest]: "invalid_request_error",
  [GatewayErrorCode.RouteNotFound]: "not_found_error",
  [GatewayErrorCode.UpstreamNetworkError]: "api_error",
  [GatewayErrorCode.UpstreamAborted]: "api_error",
  [GatewayErrorCode.InternalError]: "api_error",
};

const requestAdapter: RequestAdapter = {
  getModel: async (request: Request): Promise<string> => {
    const payload: unknown = await request.clone().json();
    return requestSchema.parse(payload).model;
  },
  getGatewayToken: ({ headers }: Request): string => {
    const token = headers.get("x-api-key");
    invariant(token, new Error("Anthropic gateway token is required"));
    return token;
  },
  requestTransformer: ({ request, options }) => {
    const { providerToken, baseUrl = defaultBaseUrl, endpoint = defaultEndpoint } = options;
    const upstreamRequest = new Request(appendEndpoint(baseUrl, endpoint), request);
    return withProviderHeaders(upstreamRequest, {
      "x-api-key": providerToken,
    });
  },
};

const responseAdapter: ResponseAdapter = {
  createModelsResponse: (providers) => {
    const models = collectModels(providers);
    const createdAt = new Date().toISOString();

    return Response.json({
      data: models.map((id) => ({
        type: "model",
        id,
        display_name: id,
        created_at: createdAt,
      })),
      has_more: false,
      first_id: models.at(0) ?? null,
      last_id: models.at(-1) ?? null,
    });
  },
  createErrorResponse: (error) => {
    const { code, message, status } = error;
    return Response.json(
      {
        type: "error",
        error: {
          type: errorTypeByCode[code],
          message,
        },
      },
      { status },
    );
  },
  responseTransformer: (response) => response,
};

export const anthropicAdapter: ProtocolAdapter = {
  defaultEndpoint,
  defaultBaseUrl,
  protocolType,
  requestAdapter,
  responseAdapter,
};
