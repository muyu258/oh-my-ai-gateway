import { invariant } from "es-toolkit";
import { ProtocolType } from "../../protocol.types";
import { protocolRegistry } from "../../protocol.registry";
import { appendEndpoint, withHeaders } from "../adapter.helpers";
import type { ProtocolAdapter } from "../adapter.types";
import { createErrorResponse, createModelsResponse } from "./shared/openai.helpers";
import { consumeJsonEventStream } from "./shared/response-parser.helpers";
import { emptyUsage } from "../adapter.helpers";

const parseUsage = (usage: Record<string, any> | undefined) => {
  if (!usage) return emptyUsage();
  const totalInput = usage.prompt_tokens ?? null;
  const cacheReadInputTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;
  return {
    inputTokens: totalInput === null ? null : Math.max(0, totalInput - cacheReadInputTokens),
    outputTokens: usage.completion_tokens ?? null,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens,
  };
};

const defaultEndpoint = protocolRegistry[ProtocolType.OpenaiCompatible].defaultEndpoint;
const defaultBaseUrl = "https://api.openai.com";
const protocolType = ProtocolType.OpenaiCompatible;

export const openaiCompatibleAdapter: ProtocolAdapter = {
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
  transformer: ({ request, options }) => {
    const { token, baseUrl, endpoint } = options;
    const upstreamRequest = new Request(
      appendEndpoint(baseUrl ?? defaultBaseUrl, endpoint ?? defaultEndpoint),
      request,
    );
    return withHeaders(upstreamRequest, {
      authorization: `Bearer ${token}`,
    });
  },

  parseStreamingResponse: async (response) => {
    let parsedUsage = emptyUsage();

    await consumeJsonEventStream(response, (data) => {
      if (data.error || data.object === "error") throw data.error ?? data;

      if (data.usage) {
        parsedUsage = parseUsage(data.usage);
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
