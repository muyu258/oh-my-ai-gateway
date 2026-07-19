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

export const openaiCompatibleAdapter: ProtocolAdapter = {
  protocolType: ProtocolType.OpenAiCompatible,
  requestAdapter: {
    getModel,
    requestTransformer: ({ request }) => request,
  },
  responseAdapter: {
    responseTransformer: (response) => response,
  },
};
