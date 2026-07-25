import { collectModels } from "#/lib/provider/provider.helpers";
import type { Provider } from "#/lib/provider/provider.types";
import type { ParsedUsage } from "./adapter.types";

/** Joins a base URL and endpoint without duplicate boundary slashes. */
export const appendEndpoint = (baseUrl: string, endpoint: string): string =>
  `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

/** Exposes configured provider models using the OpenAI models-list shape. */
export const createOpenaiModelsResponse = (providers: Provider[]): Response => {
  const created = Math.floor(Date.now() / 1000);

  return Response.json({
    object: "list",
    data: collectModels(providers).map((id) => ({
      id,
      object: "model",
      created,
      owned_by: "gateway",
    })),
  });
};

const requestHeadersToRemove = [
  "authorization",
  "connection",
  "host",
  "transfer-encoding",
  "x-api-key",
  "x-provider-name",
];

export const withHeaders = (request: Request, headersToSet: Record<string, string>): Request => {
  const headers = new Headers(request.headers);

  for (const header of requestHeadersToRemove) headers.delete(header);
  for (const [name, value] of Object.entries(headersToSet)) headers.set(name, value);

  return new Request(request, { headers });
};

export const emptyUsage = (): ParsedUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
});
