"server-only";

import { invariant } from "es-toolkit";
import { GatewayError, GatewayErrorCode } from "#/lib/errors/gateway-error";

export const AUTH_COOKIE_NAME = "gateway_token";

export const getConfiguredGatewayToken = (): string => {
  return process.env.GATEWAY_TOKEN || "TOKEN";
};

export const isValidGatewayToken = (token: unknown): token is string =>
  typeof token === "string" && token.length > 0 && token === getConfiguredGatewayToken();

export const authByToken = (token: unknown) => {
  invariant(
    isValidGatewayToken(token),
    new GatewayError(GatewayErrorCode.InvalidRequest, "Invalid gateway token"),
  );
};
