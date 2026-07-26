import { describe, expect, test } from "bun:test";

import { ProtocolType } from "../../protocol.types";
import type { Provider } from "#/lib/provider/provider.types";
import { collectModels, withHeaders } from "../adapter.helpers";

const provider = (id: string, models: Provider["models"]): Provider => ({
  id,
  name: id,
  order: 1,
  models,
  testModel: Object.keys(models)[0] ?? null,
  testProtocol: ProtocolType.OpenaiCompatible,
  protocols: { [ProtocolType.OpenaiCompatible]: { endpoint: "", enabled: true } },
  websiteUrl: null,
  baseUrl: null,
  token: "secret",
  enabled: true,
  costMultiplier: "1",
  pricingOverrides: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("collectModels", () => {
  test("expands aliases and returns a sorted, deduplicated public model list", () => {
    expect(
      collectModels([
        provider("first", { "real-b": { aliases: ["shared", "fast"] } }),
        provider("second", { "real-a": { aliases: ["shared"] } }),
      ]),
    ).toEqual(["fast", "real-a", "real-b", "shared"]);
  });
});

describe("withHeaders", () => {
  test("removes gateway, credential, and hop-by-hop headers before applying upstream headers", () => {
    const request = new Request("https://gateway.example/v1/messages", {
      headers: {
        authorization: "Bearer gateway-token",
        connection: "keep-alive",
        host: "gateway.example",
        "transfer-encoding": "chunked",
        "x-api-key": "gateway-token",
        "x-provider-id": "00000000-0000-4000-8000-000000000001",
        "x-provider-name": "provider-a",
        "x-request-id": "request-1",
      },
    });

    const upstream = withHeaders(request, {
      authorization: "Bearer provider-token",
    });

    expect(upstream.headers.get("authorization")).toBe("Bearer provider-token");
    expect(upstream.headers.get("x-request-id")).toBe("request-1");
    for (const name of [
      "connection",
      "host",
      "transfer-encoding",
      "x-api-key",
      "x-provider-id",
      "x-provider-name",
    ]) {
      expect(upstream.headers.get(name)).toBeNull();
    }
  });
});
