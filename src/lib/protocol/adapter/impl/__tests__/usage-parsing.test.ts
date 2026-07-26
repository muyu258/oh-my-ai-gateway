import { describe, expect, test } from "bun:test";

import type { ProtocolAdapter } from "../../adapter.types";
import { anthropicAdapter } from "../anthropic";
import { openaiCompatibleAdapter } from "../openai-compatible";
import { openaiResponseAdapter } from "../openai-response";

const emptyUsage = {
  inputTokens: null,
  outputTokens: null,
  cacheCreationInputTokens: null,
  cacheReadInputTokens: null,
};

const adapters: Array<{
  name: string;
  adapter: ProtocolAdapter;
  zeroUsage: Record<string, unknown>;
}> = [
  {
    name: "OpenAI Chat Completions",
    adapter: openaiCompatibleAdapter,
    zeroUsage: { prompt_tokens: 0, completion_tokens: 0 },
  },
  {
    name: "OpenAI Responses",
    adapter: openaiResponseAdapter,
    zeroUsage: { input_tokens: 0, output_tokens: 0 },
  },
  {
    name: "Anthropic Messages",
    adapter: anthropicAdapter,
    zeroUsage: { input_tokens: 0, output_tokens: 0 },
  },
];

describe("adapter usage parsing", () => {
  for (const { name, adapter, zeroUsage } of adapters) {
    test(`${name} distinguishes missing usage from explicit zeroes`, async () => {
      expect(await adapter.parseJsonResponse(Response.json({}))).toEqual(emptyUsage);
      expect(await adapter.parseJsonResponse(Response.json({ usage: zeroUsage }))).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      });
    });
  }

  test("normalizes cache tokens for all protocols", async () => {
    expect(
      await openaiCompatibleAdapter.parseJsonResponse(
        Response.json({
          usage: {
            prompt_tokens: 100,
            completion_tokens: 20,
            prompt_tokens_details: { cached_tokens: 40 },
          },
        }),
      ),
    ).toEqual({
      inputTokens: 60,
      outputTokens: 20,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 40,
    });
    expect(
      await openaiResponseAdapter.parseJsonResponse(
        Response.json({
          usage: {
            input_tokens: 100,
            output_tokens: 20,
            input_tokens_details: { cached_tokens: 40 },
          },
        }),
      ),
    ).toEqual({
      inputTokens: 60,
      outputTokens: 20,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 40,
    });
    expect(
      await anthropicAdapter.parseJsonResponse(
        Response.json({
          usage: {
            input_tokens: 100,
            output_tokens: 20,
            cache_creation_input_tokens: 10,
            cache_read_input_tokens: 40,
          },
        }),
      ),
    ).toEqual({
      inputTokens: 100,
      outputTokens: 20,
      cacheCreationInputTokens: 10,
      cacheReadInputTokens: 40,
    });
  });

  test("parses usage from each protocol's SSE events", async () => {
    const responses: Array<[ProtocolAdapter, string]> = [
      [
        openaiCompatibleAdapter,
        'data: {"usage":{"prompt_tokens":12,"completion_tokens":5,"prompt_tokens_details":{"cached_tokens":3}}}\n\n',
      ],
      [
        openaiResponseAdapter,
        'data: {"type":"response.completed","response":{"usage":{"input_tokens":12,"output_tokens":5,"input_tokens_details":{"cached_tokens":3}}}}\n\n',
      ],
      [
        anthropicAdapter,
        'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":9,"cache_read_input_tokens":3}}}\n\nevent: message_delta\ndata: {"type":"message_delta","usage":{"output_tokens":5}}\n\n',
      ],
    ];

    for (const [adapter, body] of responses) {
      expect(
        await adapter.parseStreamingResponse(
          new Response(body, { headers: { "content-type": "text/event-stream" } }),
        ),
      ).toEqual({
        inputTokens: 9,
        outputTokens: 5,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 3,
      });
    }
  });

  test("keeps Anthropic streaming output unknown without a final delta", async () => {
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
