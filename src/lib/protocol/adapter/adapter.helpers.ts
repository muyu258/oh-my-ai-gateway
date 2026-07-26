import type { Provider } from "#/lib/provider/provider.types";
import type { ParsedUsage } from "./adapter.types";

/** Joins a base URL and endpoint without duplicate boundary slashes. */
export const appendEndpoint = (baseUrl: string, endpoint: string): string =>
  `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

export const collectModels = (providers: Provider[]): string[] =>
  [...new Set(providers.flatMap(({ models }) => models))].sort((left, right) =>
    left.localeCompare(right),
  );

const requestHeadersToRemove = [
  "authorization",
  "connection",
  "host",
  "transfer-encoding",
  "x-api-key",
  "x-provider-id",
  "x-provider-name",
];

export const withHeaders = (request: Request, headersToSet: Record<string, string>): Request => {
  const headers = new Headers(request.headers);

  for (const header of requestHeadersToRemove) headers.delete(header);
  for (const [name, value] of Object.entries(headersToSet)) headers.set(name, value);

  return new Request(request, { headers });
};

export const emptyUsage = (): ParsedUsage => ({
  inputTokens: null,
  outputTokens: null,
  cacheCreationInputTokens: null,
  cacheReadInputTokens: null,
});
