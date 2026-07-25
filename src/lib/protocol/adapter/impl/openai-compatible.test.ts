import { describe, expect, test } from "bun:test";

import { openaiCompatibleAdapter } from "./openai-compatible";

describe("openaiCompatibleAdapter usage parsing", () => {
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

  test("subtracts cached tokens from ordinary input", async () => {
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
});
