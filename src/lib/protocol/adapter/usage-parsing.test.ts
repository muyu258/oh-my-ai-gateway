import { describe, expect, test } from "bun:test";

import { anthropicAdapter } from "./impl/anthropic";
import { openaiCompatibleAdapter } from "./impl/openai-compatible";

describe("usage parsing", () => {
  test("keeps missing usage unavailable and preserves explicit zeroes", async () => {
    expect(await openaiCompatibleAdapter.parseJsonResponse(Response.json({ choices: [] }))).toEqual(
      {
        inputTokens: null,
        outputTokens: null,
        cacheCreationInputTokens: null,
        cacheReadInputTokens: null,
      },
    );
    expect(
      await openaiCompatibleAdapter.parseJsonResponse(
        Response.json({ usage: { prompt_tokens: 0, completion_tokens: 0 } }),
      ),
    ).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    });
  });

  test("subtracts OpenAI cached tokens from ordinary input", async () => {
    const parsed = await openaiCompatibleAdapter.parseJsonResponse(
      Response.json({
        usage: {
          prompt_tokens: 100,
          completion_tokens: 20,
          prompt_tokens_details: { cached_tokens: 40 },
        },
      }),
    );
    expect(parsed).toEqual({
      inputTokens: 60,
      outputTokens: 20,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 40,
    });
  });

  test("keeps Anthropic output unknown when a stream has no final delta", async () => {
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
