import { collectModels } from "#/infra/gateway/provider/provider.helpers";
import type { Provider } from "#/infra/gateway/provider/provider.types";
import type {
  CollectedResponse,
  ResponseAdapter,
  ResponseCompletion,
  SseEvent,
  SseResponseCollector,
} from "./adapter.types";

/** Joins a base URL and endpoint without duplicate boundary slashes. */
export const appendEndpoint = (baseUrl: string, endpoint: string): string =>
  `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

/** Exposes configured provider models using the OpenAI models-list shape. */
export const createOpenaiModelsResponse = (providers: Provider[]): Response => {
  const created = Math.floor(Date.now() / 1000);

  return Response.json({
    object: "list",
    data: collectModels(providers).map((id) => ({
      id,
      object: "model",
      created,
      owned_by: "gateway",
    })),
  });
};

/** Hop-by-hop request headers that must not be forwarded upstream. */
const hopByHopHeaders = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "x-provider-name",
];

/**
 * Creates the header set sent to a provider.
 * Removes client gateway credentials and hop-by-hop headers before setting provider credentials.
 */
export const withProviderHeaders = (
  request: Request,
  headersToSet: Record<string, string>,
): Request => {
  const headers = new Headers(request.headers);

  headers.delete("authorization");
  for (const header of hopByHopHeaders) headers.delete(header);
  for (const [name, value] of Object.entries(headersToSet)) headers.set(name, value);

  return new Request(request, { headers });
};

/** Treats only standard text/event-stream responses as incrementally collected SSE. */
const isEventStreamResponse = (response: Response): boolean =>
  response.headers.get("content-type")?.toLowerCase().includes("text/event-stream") ?? false;

type FirstByteTracker = {
  mark: () => void;
  finish: () => void;
  timeToFirstByteMs: Promise<number | undefined>;
};

/** Resolves once with the elapsed time at the first non-empty response chunk. */
const createFirstByteTracker = (startedAt: number, now: () => number): FirstByteTracker => {
  let resolveTimeToFirstByte: (value: number | undefined) => void = () => undefined;
  let isSettled = false;
  const timeToFirstByteMs = new Promise<number | undefined>((resolve) => {
    resolveTimeToFirstByte = resolve;
  });

  const settle = (value: number | undefined): void => {
    if (isSettled) return;
    isSettled = true;
    resolveTimeToFirstByte(value);
  };

  return {
    mark: () => settle(Math.max(0, Math.round(now() - startedAt))),
    finish: () => settle(undefined),
    timeToFirstByteMs,
  };
};

/**
 * Reads a complete JSON payload from a cloned non-stream response without consuming the original.
 * Empty or invalid JSON cannot produce a completed adapter payload.
 */
const readResponseCompletion = async (
  response: Response,
  firstByteTracker: FirstByteTracker,
): Promise<ResponseCompletion> => {
  try {
    const body = response.clone().body;
    if (!body) {
      firstByteTracker.finish();
      return { type: "failed", error: new Error("Response body is empty") };
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    while (true) {
      const result = await reader.read();
      if (result.done) break;
      if (result.value.byteLength > 0) firstByteTracker.mark();
      text += decoder.decode(result.value, { stream: true });
    }
    firstByteTracker.finish();
    text += decoder.decode();

    if (!text.trim()) {
      return { type: "failed", error: new Error("Response body is empty") };
    }

    try {
      const payload: unknown = JSON.parse(text);
      return { type: "completed", payload };
    } catch (error) {
      return { type: "failed", error };
    }
  } catch (error) {
    firstByteTracker.finish();
    return { type: "failed", error };
  }
};

/** Converts a collector result into a completion while rejecting a missing payload. */
const completeResponseCollection = (collector: SseResponseCollector): ResponseCompletion => {
  try {
    const payload = collector.complete();
    return payload === undefined
      ? { type: "failed", error: new Error("Response collection completed without a payload") }
      : { type: "completed", payload };
  } catch (error) {
    return { type: "failed", error };
  }
};

/** An SSE parser that accepts incremental chunks and flushes remaining data at stream end. */
type SseParser = {
  push: (chunk: Uint8Array) => void;
  finish: () => void;
};

/**
 * Reconstructs SSE events across arbitrary chunk boundaries.
 * The parser handles only SSE framing and JSON parsing, not protocol-specific semantics.
 */
const createSseParser = (onEvent: (event: SseEvent) => void): SseParser => {
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName: string | undefined;
  let dataLines: string[] = [];

  /** Dispatches a frame at an empty line after joining all of its data fields. */
  const dispatch = (): void => {
    const data = dataLines.join("\n");
    const event = eventName;
    eventName = undefined;
    dataLines = [];

    if (!data || data.trim() === "[DONE]") return;

    try {
      const parsed: unknown = JSON.parse(data);
      onEvent({ event, data: parsed });
    } catch {
      // Invalid observation data must not interrupt forwarding the upstream stream.
    }
  };

  /** Processes one SSE field line; comments and heartbeats are not sent to the collector. */
  const processLine = (line: string): void => {
    if (!line) {
      dispatch();
      return;
    }
    if (line.startsWith(":")) return;

    const colonIndex = line.indexOf(":");
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    const rawValue = colonIndex === -1 ? "" : line.slice(colonIndex + 1);
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;

    if (field === "event") eventName = value;
    if (field === "data") dataLines.push(value);
  };

  /**
   * Consumes complete lines while retaining a partial line across chunks.
   * When flushing, trailing content without a line ending is processed as the final line.
   */
  const drainLines = (flush: boolean): void => {
    while (buffer) {
      let lineEnd = -1;
      let delimiterLength = 0;

      for (let index = 0; index < buffer.length; index += 1) {
        const character = buffer[index];
        if (character === "\n") {
          lineEnd = index;
          delimiterLength = 1;
          break;
        }
        if (character === "\r") {
          if (!flush && index === buffer.length - 1) return;
          lineEnd = index;
          delimiterLength = buffer[index + 1] === "\n" ? 2 : 1;
          break;
        }
      }

      if (lineEnd === -1) {
        if (flush) {
          processLine(buffer);
          buffer = "";
        }
        return;
      }

      processLine(buffer.slice(0, lineEnd));
      buffer = buffer.slice(lineEnd + delimiterLength);
    }
  };

  return {
    push: (chunk) => {
      buffer += decoder.decode(chunk, { stream: true });
      drainLines(false);
    },
    finish: () => {
      buffer += decoder.decode();
      drainLines(true);
      dispatch();
    },
  };
};

/**
 * Wraps an SSE response so the client receives the original bytes with normal backpressure while
 * events are parsed and observed. Completion resolves only on end, failure, or cancellation.
 */
const collectEventStreamResponse = (
  response: Response,
  collector: SseResponseCollector,
  firstByteTracker: FirstByteTracker,
): CollectedResponse => {
  // A bodyless SSE response needs no wrapper but still produces a consistent completion result.
  if (!response.body) {
    firstByteTracker.finish();
    const completion = Promise.resolve().then(() => completeResponseCollection(collector));
    return {
      forwardedResponse: response,
      completion,
      timeToFirstByteMs: firstByteTracker.timeToFirstByteMs,
      isStream: true,
    };
  }

  const reader = response.body.getReader();
  let resolveCompletion: (completion: ResponseCompletion) => void = () => undefined;
  let isSettled = false;
  let hasCollectionError = false;
  let collectionError: unknown;

  const completion = new Promise<ResponseCompletion>((resolve) => {
    resolveCompletion = resolve;
  });
  // End, collector failure, and cancellation may race; only the first terminal state wins.
  const settle = (result: ResponseCompletion): void => {
    if (isSettled) return;
    isSettled = true;
    resolveCompletion(result);
  };
  // Collector failures affect completion metadata but do not stop forwarding subsequent bytes.
  const parser = createSseParser((event) => {
    if (hasCollectionError) return;
    try {
      collector.append(event);
    } catch (error) {
      hasCollectionError = true;
      collectionError = error;
    }
  });

  const body = new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      try {
        const result = await reader.read();
        if (!result.done) {
          if (result.value.byteLength > 0) firstByteTracker.mark();
          // Observe the chunk, then enqueue the exact same bytes for the client.
          parser.push(result.value);
          controller.enqueue(result.value);
          return;
        }

        parser.finish();
        if (hasCollectionError) {
          settle({ type: "failed", error: collectionError });
        } else {
          settle(completeResponseCollection(collector));
        }
        firstByteTracker.finish();
        controller.close();
      } catch (error) {
        firstByteTracker.finish();
        settle({ type: "failed", error });
        controller.error(error);
      }
    },
    cancel: async (reason) => {
      // Cancel the upstream reader when the client stops consuming the response.
      firstByteTracker.finish();
      settle({ type: "cancelled", reason });
      try {
        await reader.cancel(reason);
      } catch {
        // Client cancellation is complete; do not replace its reason with an upstream error.
      }
    },
  });

  return {
    forwardedResponse: new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }),
    completion,
    timeToFirstByteMs: firstByteTracker.timeToFirstByteMs,
    isStream: true,
  };
};

type ResponseCollectionTiming = {
  startedAt?: number;
  now?: () => number;
};

/**
 * Provides one collection entry point for direct responses and SSE.
 * Callers can return the response immediately and use completion when the payload is available.
 */
export const collectResponse = (
  response: Response,
  createSseResponseCollector: ResponseAdapter["createSseResponseCollector"],
  timing: ResponseCollectionTiming = {},
): CollectedResponse => {
  const { startedAt = performance.now(), now = () => performance.now() } = timing;
  const firstByteTracker = createFirstByteTracker(startedAt, now);

  if (!isEventStreamResponse(response)) {
    return {
      forwardedResponse: response,
      completion: readResponseCompletion(response, firstByteTracker),
      timeToFirstByteMs: firstByteTracker.timeToFirstByteMs,
      isStream: false,
    };
  }

  return collectEventStreamResponse(response, createSseResponseCollector(), firstByteTracker);
};
