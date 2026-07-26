import { afterEach, describe, expect, test } from "bun:test";

import { ProtocolType } from "../protocol/protocol.types";
import { discoverProviderModels, testProviderProtocol } from "./provider-discovery";
import type { Provider } from "./provider.types";

const originalFetch = globalThis.fetch;

const provider: Provider = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test provider",
  models: ["first-model", "second-model"],
  testModel: "second-model",
  protocols: {
    [ProtocolType.OpenaiCompatible]: { endpoint: "/custom/chat", enabled: true },
    [ProtocolType.OpenaiResponse]: { endpoint: "", enabled: true },
    [ProtocolType.Anthropic]: { endpoint: "", enabled: true },
  },
  websiteUrl: null,
  baseUrl: "https://provider.example/api",
  token: "provider-secret",
  enabled: true,
  costMultiplier: "1",
  pricingOverrides: {},
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const gateway = { baseUrl: "http://gateway.example", token: "gateway-secret" };

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("discoverProviderModels", () => {
  test("fetches and normalizes an OpenAI-compatible model list", async () => {
    let upstreamRequest: Request | undefined;
    globalThis.fetch = ((input, init) => {
      upstreamRequest = new Request(input, init);
      return Promise.resolve(
        Response.json({ data: [{ id: "model-b" }, { id: "model-a" }, { id: "model-b" }] }),
      );
    }) as typeof fetch;

    const result = await discoverProviderModels(provider, ProtocolType.OpenaiCompatible);

    expect(result.models).toEqual(["model-a", "model-b"]);
    expect(upstreamRequest?.url).toBe("https://provider.example/api/v1/models");
    expect(upstreamRequest?.headers.get("authorization")).toBe("Bearer provider-secret");
  });

  test("uses Anthropic authentication headers", async () => {
    let upstreamRequest: Request | undefined;
    globalThis.fetch = ((input, init) => {
      upstreamRequest = new Request(input, init);
      return Promise.resolve(Response.json({ data: [{ id: "claude-test" }] }));
    }) as typeof fetch;

    await discoverProviderModels(provider, ProtocolType.Anthropic);

    expect(upstreamRequest?.headers.get("x-api-key")).toBe("provider-secret");
    expect(upstreamRequest?.headers.get("anthropic-version")).toBe("2023-06-01");
    expect(upstreamRequest?.headers.get("authorization")).toBeNull();
  });

  test("rejects discovery through a disabled protocol", async () => {
    await expect(
      discoverProviderModels(
        {
          ...provider,
          protocols: {
            ...provider.protocols,
            [ProtocolType.OpenaiResponse]: { endpoint: "", enabled: false },
          },
        },
        ProtocolType.OpenaiResponse,
      ),
    ).rejects.toThrow("Enable this protocol");
  });
});

describe("testProviderProtocol", () => {
  test("uses the configured test model through the gateway chat route", async () => {
    let upstreamRequest: Request | undefined;
    globalThis.fetch = ((input, init) => {
      upstreamRequest = new Request(input, init);
      return Promise.resolve(Response.json({ choices: [] }));
    }) as typeof fetch;

    const result = await testProviderProtocol(provider, ProtocolType.OpenaiCompatible, gateway);
    const payload: unknown = await upstreamRequest?.json();

    expect(result.model).toBe("second-model");
    expect(upstreamRequest?.url).toBe("http://gateway.example/v1/chat/completions");
    expect(upstreamRequest?.headers.get("authorization")).toBe("Bearer gateway-secret");
    expect(upstreamRequest?.headers.get("x-provider-id")).toBe(provider.id);
    expect(upstreamRequest?.headers.get("x-provider-name")).toBeNull();
    expect(upstreamRequest?.headers.get("user-agent")).toBe("gateway/test");
    expect(payload).toEqual({
      model: "second-model",
      messages: [{ role: "user", content: "Reply with OK." }],
      stream: false,
    });
  });

  test("creates a non-stream Responses request", async () => {
    let upstreamRequest: Request | undefined;
    globalThis.fetch = ((input, init) => {
      upstreamRequest = new Request(input, init);
      return Promise.resolve(Response.json({ id: "response-test" }));
    }) as typeof fetch;

    await testProviderProtocol(provider, ProtocolType.OpenaiResponse, gateway);

    expect(upstreamRequest?.url).toBe("http://gateway.example/v1/responses");
    expect(await upstreamRequest?.json()).toEqual({
      model: "second-model",
      input: "Reply with OK.",
      stream: false,
    });
  });

  test("creates a non-stream Anthropic request with protocol headers", async () => {
    let upstreamRequest: Request | undefined;
    globalThis.fetch = ((input, init) => {
      upstreamRequest = new Request(input, init);
      return Promise.resolve(Response.json({ id: "message-test" }));
    }) as typeof fetch;

    await testProviderProtocol(provider, ProtocolType.Anthropic, gateway);

    expect(upstreamRequest?.url).toBe("http://gateway.example/v1/messages");
    expect(upstreamRequest?.headers.get("x-api-key")).toBe("gateway-secret");
    expect(upstreamRequest?.headers.get("x-provider-id")).toBe(provider.id);
    expect(await upstreamRequest?.json()).toEqual({
      model: "second-model",
      max_tokens: 1,
      messages: [{ role: "user", content: "Reply with OK." }],
      stream: false,
    });
  });

  test("falls back to the first model when no test model is configured", async () => {
    globalThis.fetch = ((_input, _init) =>
      Promise.resolve(Response.json({ choices: [] }))) as typeof fetch;

    const result = await testProviderProtocol(
      { ...provider, testModel: null },
      ProtocolType.OpenaiCompatible,
      gateway,
    );

    expect(result.model).toBe("first-model");
  });
});
