import { handleGatewayRequest } from "#/infra/gateway/application/handle-gateway-request";
import { openaiCompatibleAdapter } from "#/infra/gateway/protocol/adapter";
export const POST = (request: Request): Promise<Response> =>
  handleGatewayRequest({
    request,
    adapter: openaiCompatibleAdapter,
  });
