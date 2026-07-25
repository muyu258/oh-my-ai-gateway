import { invariant } from "es-toolkit";
import { defaultTo } from "es-toolkit/compat";
import { ProtocolType } from "../../protocol.types";
import { appendEndpoint, withHeaders } from "../adapter.helpers";
import type { ProtocolAdapter } from "../adapter.types";
import { createErrorResponse, createModelsResponse } from "./shared/openai.helpers";
import { consumeJsonEventStream } from "./shared/response-parser.helpers";

const defaultEndpoint = "/v1/chat/completions";
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
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadInputTokens = 0;

    await consumeJsonEventStream(response, (data) => {
      if (data.error || data.object === "error") throw data.error ?? data;

      if (data.usage) {
        inputTokens = defaultTo(data.usage.prompt_tokens, 0);
        outputTokens = defaultTo(data.usage.completion_tokens, 0);
        cacheReadInputTokens = defaultTo(data.usage.prompt_tokens_details?.cached_tokens, 0);
      }
    });

    return {
      inputTokens,
      outputTokens,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens,
    };
  },
  parseJsonResponse: async (response) => {
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadInputTokens = 0;
    const data = await response.json();

    if (data.usage) {
      inputTokens = defaultTo(data.usage.prompt_tokens, 0);
      outputTokens = defaultTo(data.usage.completion_tokens, 0);
      cacheReadInputTokens = defaultTo(data.usage.prompt_tokens_details?.cached_tokens, 0);
    }

    return {
      inputTokens,
      outputTokens,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens,
    };
  },
  createModelsResponse,
  createErrorResponse,
};
