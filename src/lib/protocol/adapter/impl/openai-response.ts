import { invariant } from "es-toolkit";
import { ProtocolType } from "../../protocol.types";
import { protocolRegistry } from "../../protocol.registry";
import { appendEndpoint, withHeaders, withUpstreamModel } from "../adapter.helpers";
import type { ProtocolAdapter } from "../adapter.types";
import { createErrorResponse, createModelsResponse } from "./shared/openai.helpers";
import { consumeJsonEventStream } from "./shared/response-parser.helpers";
import { emptyUsage } from "../adapter.helpers";

const parseUsage = (usage: Record<string, any> | undefined) => {
  if (!usage) return emptyUsage();
  const totalInput = usage.input_tokens ?? null;
  const cacheReadInputTokens = usage.input_tokens_details?.cached_tokens ?? 0;
  return {
    inputTokens: totalInput === null ? null : Math.max(0, totalInput - cacheReadInputTokens),
    outputTokens: usage.output_tokens ?? null,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens,
  };
};

const defaultEndpoint = protocolRegistry[ProtocolType.OpenaiResponse].defaultEndpoint;
const defaultBaseUrl = "https://api.openai.com";
const protocolType = ProtocolType.OpenaiResponse;

export const openaiResponseAdapter: ProtocolAdapter = {
  defaultEndpoint,
  defaultBaseUrl,
  protocolType,

  getModel: async (request) => {
    const payload = await request.clone().json();
    return payload["model"];
  },
  getToken: ({ headers }) => {
    const authorization = headers.get("authorization");
    invariant(authorization, new Error("Bearer gateway token is required"));
    return authorization.replace(/^Bearer\s+/i, "");
  },
  transformer: async ({ request, options }) => {
    const { token, baseUrl, endpoint, requestedModel, upstreamModel } = options;
    const preparedRequest = await withUpstreamModel(request, requestedModel, upstreamModel);
    const upstreamRequest = new Request(
      appendEndpoint(baseUrl ?? defaultBaseUrl, endpoint ?? defaultEndpoint),
      preparedRequest,
    );
    return withHeaders(upstreamRequest, {
      authorization: `Bearer ${token}`,
    });
  },

  parseStreamingResponse: async (response) => {
    let parsedUsage = emptyUsage();

    await consumeJsonEventStream(response, (data) => {
      if (data.type === "error" || data.type === "response.failed") {
        throw data.response?.error ?? data.error ?? data;
      }

      if (data.response?.usage) {
        parsedUsage = parseUsage(data.response.usage);
      }
    });

    return parsedUsage;
  },
  parseJsonResponse: async (response) => {
    const data = await response.json();
    return parseUsage(data.usage);
  },
  createModelsResponse,
  createErrorResponse,
};
