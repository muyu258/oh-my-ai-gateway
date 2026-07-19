import { ProtocolType } from "../../protocol.types";
import type { ProtocolAdapter } from "../adapter.types";
import { z } from "zod";

const requestSchema = z.object({
  model: z.string().min(1),
});

const getModel = async (request: Request): Promise<string> => {
  const payload: unknown = await request.clone().json();
  return requestSchema.parse(payload).model;
};

export const openaiResponseAdapter: ProtocolAdapter = {
  protocolType: ProtocolType.OpenaiResponse,
  requestAdapter: {
    getModel,
    requestTransformer: ({ request }) => request,
  },
  responseAdapter: {
    responseTransformer: (response) => response,
  },
};
