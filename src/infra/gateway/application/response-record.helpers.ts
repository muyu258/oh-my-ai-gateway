import type {
  ResponseAdapter,
  ResponseCompletion,
  ResponseMeta,
} from "../protocol/adapter/adapter.types";

const serializeError = (error: unknown): unknown =>
  error instanceof Error ? { name: error.name, message: error.message } : error;

const unwrapErrorPayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const nestedError = (payload as Record<string, unknown>).error;
  return nestedError ?? payload;
};

export const getResponseRecordFields = (
  status: number,
  completion: ResponseCompletion,
  extractResponseMetadata: ResponseAdapter["extractResponseMetadata"],
): { metadata: ResponseMeta; error?: unknown } => {
  if (completion.type === "completed") {
    return status >= 400
      ? { metadata: {}, error: unwrapErrorPayload(completion.payload) }
      : { metadata: extractResponseMetadata(completion.payload) };
  }

  return {
    metadata: {},
    error: serializeError(completion.type === "failed" ? completion.error : completion.reason),
  };
};
