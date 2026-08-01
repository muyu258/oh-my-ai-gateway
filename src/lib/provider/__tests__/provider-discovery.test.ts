import { afterEach, describe, expect, test } from "bun:test";

import type { ProviderRecord } from "#/lib/database/drizzle/schema";
import { ProtocolType } from "../../protocol/protocol.types";
import { discoverProviderModels, testProviderProtocol } from "../provider-discovery";

const originalFetch = globalThis.fetch;

const provider: ProviderRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test provider",
  order: 1,
  models: {
    "first-model": { aliases: [] },
    "second-model": { aliases: ["second-alias"] },
  },
  testModel: "second-model",
  testProtocol: ProtocolType.OpenaiCompatible,
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
  const cases: Array<{
    name: string;
    protocol: ProtocolType;
    url: string;
    credential: [string, string];
    payload: Record<string, unknown>;
  }> = [
    {
      name: "OpenAI Chat Completions",
      protocol: ProtocolType.OpenaiCompatible,
      url: "http://gateway.example/v1/chat/completions",
      credential: ["authorization", "Bearer gateway-secret"],
      payload: {
        model: "second-model",
        messages: [{ role: "user", content: "Reply with OK." }],
        stream: false,
      },
    },
    {
      name: "OpenAI Responses",
      protocol: ProtocolType.OpenaiResponse,
      url: "http://gateway.example/v1/responses",
      credential: ["authorization", "Bearer gateway-secret"],
      payload: { model: "second-model", input: "Reply with OK.", stream: false },
    },
    {
      name: "Anthropic Messages",
      protocol: ProtocolType.Anthropic,
      url: "http://gateway.example/v1/messages",
      credential: ["x-api-key", "gateway-secret"],
      payload: {
        model: "second-model",
        max_tokens: 1,
        messages: [{ role: "user", content: "Reply with OK." }],
        stream: false,
      },
    },
  ];

  for (const connection of cases) {
    test(`creates a non-streaming ${connection.name} request`, async () => {
      let upstreamRequest: Request | undefined;
      globalThis.fetch = ((input, init) => {
        upstreamRequest = new Request(input, init);
        return Promise.resolve(Response.json({ ok: true }));
      }) as typeof fetch;

      const result = await testProviderProtocol(provider, connection.protocol, gateway);

      expect(result.model).toBe("second-model");
      expect(result.upstreamModel).toBe("second-model");
      expect(result.protocol).toBe(connection.protocol);
      expect(upstreamRequest?.url).toBe(connection.url);
      expect(upstreamRequest?.headers.get(connection.credential[0])).toBe(connection.credential[1]);
      expect(upstreamRequest?.headers.get("x-provider-id")).toBe(provider.id);
      expect(upstreamRequest?.headers.get("user-agent")).toBe("gateway/test");
      expect(await upstreamRequest?.json()).toEqual(connection.payload);
    });
  }

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

  test("tests an explicit alias while reporting its upstream model", async () => {
    let upstreamRequest: Request | undefined;
    globalThis.fetch = ((input, init) => {
      upstreamRequest = new Request(input, init);
      return Promise.resolve(Response.json({ ok: true }));
    }) as typeof fetch;

    const result = await testProviderProtocol(
      provider,
      ProtocolType.OpenaiCompatible,
      gateway,
      "second-alias",
    );

    expect(result).toMatchObject({ model: "second-alias", upstreamModel: "second-model" });
    expect((await upstreamRequest?.json())?.model).toBe("second-alias");
  });
});
