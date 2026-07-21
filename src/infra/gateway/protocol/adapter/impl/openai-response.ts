import { invariant } from "es-toolkit";
import { ProtocolType } from "../../protocol.types";
import { appendEndpoint, withProviderHeaders } from "../adapter.helpers";
import type { ProtocolAdapter, RequestAdapter, ResponseAdapter } from "../adapter.types";
import { z } from "zod";
import { createErrorResponse, createModelsResponse } from "./shared/openai.helpers";

const requestSchema = z.object({ model: z.string().min(1) });

const defaultEndpoint = "/v1/responses";
const defaultBaseUrl = "https://api.openai.com";
const protocolType = ProtocolType.OpenaiResponse;

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
  responseTransformer: (response) => response,
};

export const openaiResponseAdapter: ProtocolAdapter = {
  defaultEndpoint,
  defaultBaseUrl,
  protocolType,
  requestAdapter,
  responseAdapter,
};
