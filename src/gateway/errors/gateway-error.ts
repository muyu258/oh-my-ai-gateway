export enum GatewayErrorCode {
  InvalidRequest = "invalid_request",
  RouteNotFound = "route_not_found",
  UpstreamNetworkError = "upstream_network_error",
  UpstreamAborted = "upstream_aborted",
  InternalError = "internal_error",
}

const defaultStatusByCode: Record<GatewayErrorCode, number> = {
  [GatewayErrorCode.InvalidRequest]: 400,
  [GatewayErrorCode.RouteNotFound]: 404,
  [GatewayErrorCode.UpstreamNetworkError]: 502,
  [GatewayErrorCode.UpstreamAborted]: 499,
  [GatewayErrorCode.InternalError]: 500,
};

export const normalizeGatewayError = (error: unknown): GatewayError => {
  if (error instanceof GatewayError) return error;
  if (error instanceof Error) {
    return new GatewayError(GatewayErrorCode.InternalError, error.message);
  }
  return new GatewayError(GatewayErrorCode.InternalError, "Internal gateway error");
};

export class GatewayError extends Error {
  readonly status: number;

  constructor(
    readonly code: GatewayErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GatewayError";
    this.status = defaultStatusByCode[code];
  }
}
