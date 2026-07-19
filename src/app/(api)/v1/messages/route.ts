import { handleGatewayRequest } from "#/gateway/application/handle-gateway-request";
import { anthropicAdapter } from "#/gateway/protocol/adapter";

export const POST = (request: Request): Promise<Response> =>
  handleGatewayRequest({
    request,
    adapter: anthropicAdapter,
  });
