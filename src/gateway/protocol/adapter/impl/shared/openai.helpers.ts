import { collectModels } from "#/gateway/provider/provider.helpers";
import { GatewayError, GatewayErrorCode } from "#/gateway/errors/gateway-error";
import { ProtocolAdapter } from "../../adapter.types";

type ModelsResponse = ProtocolAdapter["responseAdapter"]["createModelsResponse"];
type ErrorResponse = ProtocolAdapter["responseAdapter"]["createErrorResponse"];

const errorTypeByCode: Record<GatewayErrorCode, string> = {
  [GatewayErrorCode.InvalidRequest]: "invalid_request_error",
  [GatewayErrorCode.RouteNotFound]: "invalid_request_error",
  [GatewayErrorCode.UpstreamNetworkError]: "api_error",
  [GatewayErrorCode.UpstreamAborted]: "api_error",
  [GatewayErrorCode.InternalError]: "api_error",
};

export const createModelsResponse: ModelsResponse = (providers) => {
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

export const createErrorResponse: ErrorResponse = (error) => {
  const { message, code, status } = error;
  return Response.json(
    {
      error: {
        message,
        type: errorTypeByCode[code],
        param: null,
        code,
      },
    },
    { status },
  );
};
