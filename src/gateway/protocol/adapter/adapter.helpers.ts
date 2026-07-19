export const appendEndpoint = (baseUrl: string, endpoint: string): string =>
  `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;
