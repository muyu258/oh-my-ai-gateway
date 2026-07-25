import { requestHandler } from "#/lib/request.handler";
import { openaiResponseAdapter } from "#/lib/protocol/adapter";

export const POST = (request: Request): Promise<Response> =>
  requestHandler({
    request,
    adapter: openaiResponseAdapter,
  });
