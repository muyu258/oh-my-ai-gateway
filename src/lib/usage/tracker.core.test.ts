import { describe, expect, mock, test } from "bun:test";

import type { NewUsage } from "#/lib/database/drizzle/schema";
import { ProtocolType } from "#/lib/protocol/protocol.types";
import type { ProtocolAdapter } from "#/lib/protocol/adapter/adapter.types";
import type { Provider } from "#/lib/provider/provider.types";
import { processUsageTracking } from "./tracker.core";

const parsedUsage = {
  inputTokens: 12,
  outputTokens: 5,
  cacheCreationInputTokens: 2,
  cacheReadInputTokens: 4,
};

const adapter: ProtocolAdapter = {
  defaultEndpoint: "/v1/messages",
  defaultBaseUrl: "https://provider.example",
  protocolType: ProtocolType.Anthropic,
  getModel: async (request) => ((await request.json()) as { model: string }).model,
  getToken: () => "token",
  transformer: ({ request }) => request,
  parseJsonResponse: async (response) => {
    await response.text();
    return parsedUsage;
  },
  parseStreamingResponse: async (response) => {
    await response.text();
    return parsedUsage;
  },
  createModelsResponse: () => Response.json({ data: [] }),
  createErrorResponse: () => Response.json({ error: true }),
};

const provider: Provider = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test provider",
  models: ["test-model"],
  testModel: "test-model",
  protocols: {
    [ProtocolType.Anthropic]: { endpoint: "", enabled: true },
  },
  websiteUrl: null,
  baseUrl: null,
  token: "secret",
  enabled: true,
  costMultiplier: "1",
  pricingOverrides: {},
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const request = () =>
  new Request("http://gateway.example/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "tracker-test" },
    body: JSON.stringify({ model: "test-model", messages: [] }),
  });

describe("tracker core: processUsageTracking", () => {
  test("persists usage metadata for a successful JSON response", async () => {
    const persistUsage = mock(async (_record: NewUsage) => {});
    const trackingRequest = request();
    const trackingResponse = Response.json({ ok: true });

    await processUsageTracking(
      trackingRequest,
      trackingResponse,
      adapter,
      provider,
      "test-model",
      { startedAt: new Date(100), timeToFirstByteMs: 42 },
      persistUsage,
    );

    expect(persistUsage).toHaveBeenCalledTimes(1);
    expect(persistUsage.mock.calls[0]?.[0]).toMatchObject({
      providerId: provider.id,
      model: "test-model",
      status: 200,
      isStream: false,
      error: undefined,
      startAt: new Date(100),
      timeToFirstByteMs: 42,
      ...parsedUsage,
    });
    expect(trackingRequest.bodyUsed).toBe(false);
    expect(trackingResponse.bodyUsed).toBe(false);
  });

  test("stores a failed response body only as usage.error", async () => {
    const persistUsage = mock(async (_record: NewUsage) => {});
    const trackingResponse = Response.json(
      { error: { type: "rate_limit", message: "Slow down" } },
      { status: 429 },
    );

    await processUsageTracking(
      request(),
      trackingResponse,
      adapter,
      provider,
      "test-model",
      { startedAt: new Date(100), timeToFirstByteMs: 42 },
      persistUsage,
    );

    const record = persistUsage.mock.calls[0]?.[0];
    expect(persistUsage).toHaveBeenCalledTimes(1);
    expect(record?.error).toEqual({ error: { type: "rate_limit", message: "Slow down" } });
    expect(record).toMatchObject({ costMicros: null, costStatus: "unavailable" });
    expect(record).not.toHaveProperty("requestBody");
    expect(record).not.toHaveProperty("responseBody");
    expect(trackingResponse.bodyUsed).toBe(false);
  });

  test("parses streaming usage from a response clone", async () => {
    const persistUsage = mock(async (_record: NewUsage) => {});
    const trackingResponse = new Response("data: {}\n\n", {
      headers: { "content-type": "text/event-stream" },
    });

    await processUsageTracking(
      request(),
      trackingResponse,
      adapter,
      provider,
      "test-model",
      { startedAt: new Date(100), timeToFirstByteMs: 42 },
      persistUsage,
    );

    expect(persistUsage).toHaveBeenCalledTimes(1);
    expect(persistUsage.mock.calls[0]?.[0]).toMatchObject({ isStream: true, ...parsedUsage });
    expect(trackingResponse.bodyUsed).toBe(false);
  });

  test("persists known usage when cost calculation fails", async () => {
    const persistUsage = mock(async (_record: NewUsage) => {});
    const invalidPricingProvider = { ...provider, costMultiplier: "invalid" };

    await processUsageTracking(
      request(),
      Response.json({ ok: true }),
      adapter,
      invalidPricingProvider,
      "test-model",
      { startedAt: new Date(100), timeToFirstByteMs: 42 },
      persistUsage,
    );

    expect(persistUsage.mock.calls[0]?.[0]).toMatchObject({
      ...parsedUsage,
      costMicros: null,
      costStatus: "error",
    });
  });

  test("persists unavailable usage when response parsing fails", async () => {
    const persistUsage = mock(async (_record: NewUsage) => {});
    const failingAdapter: ProtocolAdapter = {
      ...adapter,
      parseJsonResponse: async () => {
        throw new Error("Invalid upstream JSON");
      },
    };

    await processUsageTracking(
      request(),
      Response.json({ ok: true }),
      failingAdapter,
      provider,
      "test-model",
      { startedAt: new Date(100), timeToFirstByteMs: 42 },
      persistUsage,
    );

    expect(persistUsage.mock.calls[0]?.[0]).toMatchObject({
      inputTokens: null,
      outputTokens: null,
      cacheCreationInputTokens: null,
      cacheReadInputTokens: null,
      costMicros: null,
      costStatus: "unavailable",
    });
  });
});
