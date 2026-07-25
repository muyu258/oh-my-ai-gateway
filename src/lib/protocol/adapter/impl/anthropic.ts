import { GatewayErrorCode } from "#/lib/errors/gateway-error";
import { collectModels } from "#/lib/provider/provider.helpers";
import { invariant } from "es-toolkit";
import { ProtocolType } from "../../protocol.types";
import { protocolRegistry } from "../../protocol.registry";
import { appendEndpoint, withHeaders } from "../adapter.helpers";
import type { ProtocolAdapter } from "../adapter.types";
import { consumeJsonEventStream } from "./shared/response-parser.helpers";
import { emptyUsage } from "../adapter.helpers";

const parseUsage = (usage: Record<string, any> | undefined) => {
  if (!usage) return emptyUsage();
  return {
    inputTokens: usage.input_tokens ?? null,
    outputTokens: usage.output_tokens ?? null,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
  };
};

const defaultEndpoint = protocolRegistry[ProtocolType.Anthropic].defaultEndpoint;
const defaultBaseUrl = "https://api.anthropic.com";
const protocolType = ProtocolType.Anthropic;

const errorTypeByCode: Record<GatewayErrorCode, string> = {
  [GatewayErrorCode.InvalidRequest]: "invalid_request_error",
  [GatewayErrorCode.RouteNotFound]: "not_found_error",
  [GatewayErrorCode.UpstreamNetworkError]: "api_error",
  [GatewayErrorCode.UpstreamAborted]: "api_error",
  [GatewayErrorCode.InternalError]: "api_error",
};

export const anthropicAdapter: ProtocolAdapter = {
  defaultEndpoint,
  defaultBaseUrl,
  protocolType,

  getModel: async (request) => {
    const payload = await request.clone().json();
    return payload["model"];
  },
  getToken: ({ headers }) => {
    const token = headers.get("x-api-key");
    invariant(token, new Error("Anthropic gateway token is required"));
    return token;
  },
  transformer: ({ request, options }) => {
    const { token, baseUrl, endpoint } = options;
    const upstreamRequest = new Request(
      appendEndpoint(baseUrl ?? defaultBaseUrl, endpoint ?? defaultEndpoint),
      request,
    );
    return withHeaders(upstreamRequest, {
      "x-api-key": token,
    });
  },

  parseStreamingResponse: async (response) => {
    let parsedUsage = emptyUsage();

    await consumeJsonEventStream(response, (data) => {
      if (data.type === "error") throw data.error ?? data;
      if (data.type === "message_start" && data.message?.usage) {
        parsedUsage = parseUsage(data.message.usage);
      } else if (data.type === "message_delta" && data.usage) {
        parsedUsage.outputTokens = data.usage.output_tokens ?? null;
      }
    });

    return parsedUsage;
  },
  parseJsonResponse: async (response) => {
    const data = await response.json();
    return parseUsage(data.usage);
  },
  createModelsResponse: (providers) => {
    const models = collectModels(providers);
    const createdAt = new Date().toISOString();

    return Response.json({
      data: models.map((id) => ({
        id,
        type: "model",
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
};
