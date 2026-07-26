import { describe, expect, test } from "bun:test";

import { anthropicAdapter } from "../impl/anthropic";
import { openaiCompatibleAdapter } from "../impl/openai-compatible";
import { openaiResponseAdapter } from "../impl/openai-response";

const adapters = [openaiCompatibleAdapter, openaiResponseAdapter, anthropicAdapter];

describe("protocol alias transforms", () => {
  for (const adapter of adapters) {
    test(`${adapter.protocolType} replaces only the top-level alias model`, async () => {
      const request = new Request("http://gateway.example/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "999",
          "x-custom": "preserved",
        },
        body: JSON.stringify({
          model: "fast",
          nested: { model: "nested-model" },
          messages: [{ role: "user", content: "hello" }],
        }),
      });

      const transformed = await adapter.transformer({
        request,
        options: {
          token: "upstream-token",
          baseUrl: "https://provider.example",
          endpoint: "/custom",
          requestedModel: "fast",
          upstreamModel: "real-model",
        },
      });

      expect(transformed.url).toBe("https://provider.example/custom");
      expect(transformed.headers.get("content-length")).toBeNull();
      expect(transformed.headers.get("x-custom")).toBe("preserved");
      expect(await transformed.json()).toEqual({
        model: "real-model",
        nested: { model: "nested-model" },
        messages: [{ role: "user", content: "hello" }],
      });
    });

    test(`${adapter.protocolType} leaves a real-model body unchanged`, async () => {
      const rawBody = '{ "model": "real-model", "unchanged": true }';
      const request = new Request("http://gateway.example/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: rawBody,
      });
      const transformed = await adapter.transformer({
        request,
        options: {
          token: "upstream-token",
          baseUrl: "https://provider.example",
          endpoint: "/custom",
          requestedModel: "real-model",
          upstreamModel: "real-model",
        },
      });

      expect(await transformed.text()).toBe(rawBody);
    });
  }
});
