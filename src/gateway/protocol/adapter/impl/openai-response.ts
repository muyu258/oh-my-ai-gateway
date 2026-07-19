import { ProtocolType } from "../../protocol.types";
import { appendEndpoint, withProviderHeaders } from "../adapter.helpers";
import type { ProtocolAdapter, RequestAdapter, ResponseAdapter } from "../adapter.types";
import { z } from "zod";

const requestSchema = z.object({
  model: z.string().min(1),
});

const defaultEndpoint = "/v1/responses";
const defaultBaseUrl = "https://api.openai.com";
const protocolType = ProtocolType.OpenaiResponse;

const requestAdapter: RequestAdapter = {
  getModel: async (request: Request): Promise<string> => {
    const payload: unknown = await request.clone().json();
    return requestSchema.parse(payload).model;
  },
  requestTransformer: ({ request, options }) => {
    const { apiKey, baseUrl = defaultBaseUrl, endpoint = defaultEndpoint } = options;
    const upstreamRequest = new Request(appendEndpoint(baseUrl, endpoint), request);
    return withProviderHeaders(upstreamRequest, {
      authorization: `Bearer ${apiKey}`,
    });
  },
};

const responseAdapter: ResponseAdapter = {
  responseTransformer: (response) => response,
};

export const openaiResponseAdapter: ProtocolAdapter = {
  defaultEndpoint,
  defaultBaseUrl,
  protocolType,
  requestAdapter,
  responseAdapter,
};
