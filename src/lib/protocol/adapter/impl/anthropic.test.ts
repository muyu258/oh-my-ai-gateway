import { describe, expect, test } from "bun:test";

import { anthropicAdapter } from "./anthropic";

describe("anthropicAdapter usage parsing", () => {
  test("keeps output unknown when a stream has no final delta", async () => {
    const response = new Response(
      'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":12,"cache_read_input_tokens":3}}}\n\n',
      { headers: { "content-type": "text/event-stream" } },
    );
    expect(await anthropicAdapter.parseStreamingResponse(response)).toEqual({
      inputTokens: 12,
      outputTokens: null,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 3,
    });
  });
});
