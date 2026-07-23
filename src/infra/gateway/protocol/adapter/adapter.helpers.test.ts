import { describe, expect, test } from "bun:test";
import { collectResponse } from "./adapter.helpers";
import type { SseEvent, SseResponseCollector } from "./adapter.types";

const createEventCollector = (): SseResponseCollector => {
  const events: SseEvent[] = [];
  return {
    append: (event) => events.push(event),
    complete: () => events,
  };
};

describe("collectResponse", () => {
  test("collects non-stream JSON without replacing the response", async () => {
    const response = Response.json(
      { usage: { input_tokens: 3 } },
      { status: 201, headers: { "x-test": "preserved" } },
    );

    const collected = collectResponse(response, createEventCollector, {
      startedAt: 10,
      now: () => 37,
    });

    expect(collected.isStream).toBe(false);
    expect(collected.forwardedResponse).toBe(response);
    expect(await collected.completion).toEqual({
      type: "completed",
      payload: { usage: { input_tokens: 3 } },
    });
    expect(await collected.timeToFirstByteMs).toBe(27);
    expect(response.headers.get("x-test")).toBe("preserved");
    expect(await response.json()).toEqual({ usage: { input_tokens: 3 } });
  });

  test("keeps a non-JSON response readable and reports collection failure", async () => {
    const response = new Response("not json", {
      headers: { "content-type": "text/plain" },
    });

    const collected = collectResponse(response, createEventCollector);

    const completion = await collected.completion;

    expect(completion.type).toBe("failed");
    if (completion.type === "failed") expect(completion.error).toBeInstanceOf(SyntaxError);
    expect(await response.text()).toBe("not json");
  });

  test("reports collection failure for an empty non-stream response", async () => {
    const response = new Response(null, { status: 204 });

    const collected = collectResponse(response, createEventCollector);
    const completion = await collected.completion;

    expect(completion.type).toBe("failed");
    if (completion.type === "failed") {
      expect(completion.error).toEqual(new Error("Response body is empty"));
    }
    expect(await collected.timeToFirstByteMs).toBeUndefined();
  });

  test("forwards SSE bytes unchanged and collects frames across chunk boundaries", async () => {
    const source = [
      ": heartbeat\r\n\r\n",
      'event: first\r\ndata: {"value":\r\ndata: 1}\r\n\r\n',
      'data: {"text":"你好"}\n\n',
      "data: [DONE]\n\n",
    ].join("");
    const bytes = new TextEncoder().encode(source);
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => {
        let start = 0;
        for (const boundary of [7, 31, 57, bytes.length]) {
          controller.enqueue(bytes.slice(start, boundary));
          start = boundary;
        }
        controller.close();
      },
    });
    const response = new Response(body, {
      headers: { "content-type": "text/event-stream; charset=utf-8", "x-test": "preserved" },
    });

    const collected = collectResponse(response, createEventCollector, {
      startedAt: 100,
      now: () => 145,
    });
    const forwarded = await collected.forwardedResponse.text();

    expect(collected.isStream).toBe(true);
    expect(forwarded).toBe(source);
    expect(collected.forwardedResponse.headers.get("x-test")).toBe("preserved");
    expect(await collected.completion).toEqual({
      type: "completed",
      payload: [
        { event: "first", data: { value: 1 } },
        { event: undefined, data: { text: "你好" } },
      ],
    });
    expect(await collected.timeToFirstByteMs).toBe(45);
  });

  test("settles completion when the client cancels an SSE response", async () => {
    let cancelledWith: unknown;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        cancel: (reason) => {
          cancelledWith = reason;
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );

    const collected = collectResponse(response, createEventCollector);
    await collected.forwardedResponse.body?.cancel("client disconnected");

    expect(await collected.completion).toEqual({
      type: "cancelled",
      reason: "client disconnected",
    });
    expect(await collected.timeToFirstByteMs).toBeUndefined();
    expect(cancelledWith).toBe("client disconnected");
  });

  test("forwards the first SSE chunk before the upstream stream completes", async () => {
    const encoder = new TextEncoder();
    let sourceController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start: (controller) => {
          sourceController = controller;
          controller.enqueue(encoder.encode('data: {"part":1}\n\n'));
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );

    const collected = collectResponse(response, createEventCollector);
    let collectionCompleted = false;
    void collected.completion.then(() => {
      collectionCompleted = true;
    });

    const reader = collected.forwardedResponse.body?.getReader();
    const firstChunk = await reader?.read();

    expect(new TextDecoder().decode(firstChunk?.value)).toBe('data: {"part":1}\n\n');
    expect(collectionCompleted).toBe(false);

    sourceController?.close();
    expect((await reader?.read())?.done).toBe(true);
    expect(await collected.completion).toEqual({
      type: "completed",
      payload: [{ event: undefined, data: { part: 1 } }],
    });
  });

  test("reports collection failure when an SSE collector produces no payload", async () => {
    const response = new Response(null, {
      headers: { "content-type": "text/event-stream" },
    });
    const collected = collectResponse(response, () => ({
      append: () => undefined,
      complete: () => undefined,
    }));
    const completion = await collected.completion;

    expect(completion.type).toBe("failed");
    if (completion.type === "failed") {
      expect(completion.error).toEqual(
        new Error("Response collection completed without a payload"),
      );
    }
  });
});
