import { requestHandler } from "#/lib/request.handler";
import { openaiCompatibleAdapter } from "#/lib/protocol/adapter";
export const POST = (request: Request): Promise<Response> =>
  requestHandler({
    request,
    adapter: openaiCompatibleAdapter,
  });
