import { describe, expect, test } from "bun:test";

import { getResponseRecordFields } from "./response-record.helpers";

const extractMetadata = (payload: unknown) => ({
  usage: { inputTokens: Number((payload as { inputTokens?: number }).inputTokens ?? 0) },
});

describe("getResponseRecordFields", () => {
  test("records an error response without duplicating its error wrapper", () => {
    const payload = {
      error: {
        message: "The upstream provider rejected the request",
        type: "upstream_error",
        details: { requestId: "req_123" },
      },
    };

    expect(getResponseRecordFields(502, { type: "completed", payload }, extractMetadata)).toEqual({
      metadata: {},
      error: payload.error,
    });
  });

  test("preserves error payloads without a top-level error property", () => {
    const payload = { type: "error", message: "Service unavailable" };

    expect(getResponseRecordFields(503, { type: "completed", payload }, extractMetadata)).toEqual({
      metadata: {},
      error: payload,
    });
  });

  test("extracts metadata without recording successful payloads as errors", () => {
    expect(
      getResponseRecordFields(
        200,
        { type: "completed", payload: { inputTokens: 12 } },
        extractMetadata,
      ),
    ).toEqual({ metadata: { usage: { inputTokens: 12 } } });
  });

  test("serializes collection errors with their name and message", () => {
    expect(
      getResponseRecordFields(
        502,
        { type: "failed", error: new SyntaxError("Invalid JSON") },
        extractMetadata,
      ),
    ).toEqual({
      metadata: {},
      error: { name: "SyntaxError", message: "Invalid JSON" },
    });
  });
});
