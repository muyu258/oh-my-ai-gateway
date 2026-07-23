import { invariant } from "es-toolkit";
import { ProtocolType } from "../../protocol.types";
import { appendEndpoint, withProviderHeaders } from "../adapter.helpers";
import type {
  ProtocolAdapter,
  RequestAdapter,
  ResponseAdapter,
  SseResponseCollector,
} from "../adapter.types";
import { z } from "zod";
import { createErrorResponse, createModelsResponse } from "./shared/openai.helpers";

const requestSchema = z.object({ model: z.string().min(1) });
const responseUsageSchema = z
  .object({
    usage: z
      .object({
        input_tokens: z.number().optional(),
        output_tokens: z.number().optional(),
        input_tokens_details: z.object({ cached_tokens: z.number().optional() }).optional(),
      })
      .optional(),
  })
  .transform(({ usage }) =>
    usage
      ? {
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cachedInputTokens: usage.input_tokens_details?.cached_tokens,
          },
        }
      : {},
  );

const defaultEndpoint = "/v1/responses";
const defaultBaseUrl = "https://api.openai.com";
const protocolType = ProtocolType.OpenaiResponse;

const createSseResponseCollector = (): SseResponseCollector => {
  let response: unknown;
  let latestEvent: unknown;

  return {
    append: ({ data }) => {
      latestEvent = data;
      if (!data || typeof data !== "object" || Array.isArray(data)) return;

      const event = data as Record<string, unknown>;
      const eventResponse = event.response;
      if (eventResponse && typeof eventResponse === "object") response = eventResponse;
      if (event.type === "error" || event.type === "response.failed") {
        throw eventResponse ?? event;
      }
    },
    complete: () => response ?? latestEvent,
  };
};

const requestAdapter: RequestAdapter = {
  getModel: async (request: Request): Promise<string> => {
    const payload: unknown = await request.clone().json();
    return requestSchema.parse(payload).model;
  },
  getGatewayToken: ({ headers }: Request): string => {
    const authorization = headers.get("authorization");
    invariant(authorization, new Error("Bearer gateway token is required"));
    return authorization.replace(/^Bearer\s+/i, "");
  },
  requestTransformer: ({ request, options }) => {
    const { providerToken, baseUrl = defaultBaseUrl, endpoint = defaultEndpoint } = options;
    const upstreamRequest = new Request(appendEndpoint(baseUrl, endpoint), request);
    return withProviderHeaders(upstreamRequest, {
      authorization: `Bearer ${providerToken}`,
    });
  },
};

const responseAdapter: ResponseAdapter = {
  createModelsResponse,
  createErrorResponse,
  createSseResponseCollector,
  extractResponseMetadata: (payload) => responseUsageSchema.safeParse(payload).data ?? {},
};

export const openaiResponseAdapter: ProtocolAdapter = {
  defaultEndpoint,
  defaultBaseUrl,
  protocolType,
  requestAdapter,
  responseAdapter,
};
