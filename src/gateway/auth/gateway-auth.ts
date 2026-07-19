import { invariant } from "es-toolkit";
import { GatewayError, GatewayErrorCode } from "../errors/gateway-error";
export const getConfiguredGatewayToken = (): string => {
  return process.env.GATEWAY_TOKEN || "TOKEN";
};

export const authByToken = (token: string) => {
  invariant(
    getConfiguredGatewayToken() == token,
    new GatewayError(GatewayErrorCode.InvalidRequest, "Invalid gateway token"),
  );
};
