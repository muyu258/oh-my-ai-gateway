export const appendEndpoint = (baseUrl: string, endpoint: string): string =>
  `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

const hopByHopHeaders = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
];

export const withProviderHeaders = (
  request: Request,
  headersToSet: Record<string, string>,
): Request => {
  const headers = new Headers(request.headers);

  headers.delete("authorization");
  for (const header of hopByHopHeaders) headers.delete(header);
  for (const [name, value] of Object.entries(headersToSet)) headers.set(name, value);

  return new Request(request, { headers });
};
