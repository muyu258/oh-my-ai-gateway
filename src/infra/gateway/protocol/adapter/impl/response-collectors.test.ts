import { describe, expect, test } from "bun:test";
import { anthropicAdapter } from "./anthropic";
import { openaiCompatibleAdapter } from "./openai-compatible";
import { openaiResponseAdapter } from "./openai-response";

describe("OpenAI Responses SSE collector", () => {
  test("uses the terminal response as the complete payload", () => {
    const collector = openaiResponseAdapter.responseAdapter.createSseResponseCollector();
    collector.append({
      event: "response.created",
      data: { type: "response.created", response: { id: "resp_1", status: "in_progress" } },
    });
    collector.append({
      event: "response.completed",
      data: {
        type: "response.completed",
        response: {
          id: "resp_1",
          status: "completed",
          output: [{ type: "message", content: [{ type: "output_text", text: "hello" }] }],
          usage: {
            input_tokens: 10,
            output_tokens: 4,
            input_tokens_details: { cached_tokens: 3 },
          },
        },
      },
    });

    const payload = collector.complete();

    expect(payload).toMatchObject({ id: "resp_1", status: "completed" });
    expect(openaiResponseAdapter.responseAdapter.extractResponseMetadata(payload)).toEqual({
      usage: {
        inputTokens: 10,
        outputTokens: 4,
        cachedInputTokens: 3,
      },
    });
  });

  test("surfaces terminal protocol errors", () => {
    const collector = openaiResponseAdapter.responseAdapter.createSseResponseCollector();

    expect(() =>
      collector.append({
        event: "response.failed",
        data: {
          type: "response.failed",
          response: { id: "resp_1", status: "failed", error: { message: "upstream failed" } },
        },
      }),
    ).toThrow();
  });
});

describe("OpenAI Chat Completions SSE collector", () => {
  test("assembles content, tool calls and usage into a non-stream response shape", () => {
    const collector = openaiCompatibleAdapter.responseAdapter.createSseResponseCollector();
    collector.append({
      data: {
        id: "chatcmpl_1",
        object: "chat.completion.chunk",
        created: 1,
        model: "gpt-test",
        choices: [
          {
            index: 0,
            delta: {
              role: "assistant",
              content: "Hel",
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  type: "function",
                  function: { name: "weather", arguments: '{"city":"' },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      },
    });
    collector.append({
      data: {
        id: "chatcmpl_1",
        object: "chat.completion.chunk",
        created: 1,
        model: "gpt-test",
        choices: [
          {
            index: 0,
            delta: {
              content: "lo",
              tool_calls: [{ index: 0, function: { arguments: 'Paris"}' } }],
            },
            finish_reason: "tool_calls",
          },
        ],
      },
    });
    collector.append({
      data: {
        id: "chatcmpl_1",
        object: "chat.completion.chunk",
        created: 1,
        model: "gpt-test",
        choices: [],
        usage: {
          prompt_tokens: 8,
          completion_tokens: 5,
          prompt_tokens_details: { cached_tokens: 2 },
        },
      },
    });

    const payload = collector.complete();

    expect(payload).toMatchObject({
      id: "chatcmpl_1",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Hello",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "weather", arguments: '{"city":"Paris"}' },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
    });
    expect(openaiCompatibleAdapter.responseAdapter.extractResponseMetadata(payload)).toEqual({
      usage: {
        inputTokens: 8,
        outputTokens: 5,
        cachedInputTokens: 2,
      },
    });
  });
});

describe("Anthropic Messages SSE collector", () => {
  test("assembles content blocks, tool input and usage into a message", () => {
    const collector = anthropicAdapter.responseAdapter.createSseResponseCollector();
    collector.append({
      event: "message_start",
      data: {
        type: "message_start",
        message: {
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-test",
          content: [],
          stop_reason: null,
          usage: { input_tokens: 12, cache_read_input_tokens: 4 },
        },
      },
    });
    collector.append({
      event: "content_block_start",
      data: {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      },
    });
    collector.append({
      event: "content_block_delta",
      data: {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "Hello" },
      },
    });
    collector.append({
      event: "content_block_start",
      data: {
        type: "content_block_start",
        index: 1,
        content_block: { type: "tool_use", id: "tool_1", name: "weather", input: {} },
      },
    });
    collector.append({
      event: "content_block_delta",
      data: {
        type: "content_block_delta",
        index: 1,
        delta: { type: "input_json_delta", partial_json: '{"city":"' },
      },
    });
    collector.append({
      event: "content_block_delta",
      data: {
        type: "content_block_delta",
        index: 1,
        delta: { type: "input_json_delta", partial_json: 'Paris"}' },
      },
    });
    collector.append({
      event: "message_delta",
      data: {
        type: "message_delta",
        delta: { stop_reason: "tool_use", stop_sequence: null },
        usage: { output_tokens: 7 },
      },
    });

    const payload = collector.complete();

    expect(payload).toMatchObject({
      id: "msg_1",
      type: "message",
      role: "assistant",
      stop_reason: "tool_use",
      content: [
        { type: "text", text: "Hello" },
        { type: "tool_use", id: "tool_1", name: "weather", input: { city: "Paris" } },
      ],
      usage: { input_tokens: 12, output_tokens: 7, cache_read_input_tokens: 4 },
    });
    expect(anthropicAdapter.responseAdapter.extractResponseMetadata(payload)).toEqual({
      usage: {
        inputTokens: 12,
        outputTokens: 7,
        cachedInputTokens: 4,
      },
    });
  });
});
