import { describe, expect, test } from "bun:test";

import { withHeaders } from "./adapter.helpers";

describe("adapter helpers: withHeaders", () => {
  test("replaces gateway headers with upstream headers", () => {
    const request = new Request("https://provider.example/v1/messages", {
      method: "POST",
      headers: {
        authorization: "Bearer gateway-token",
        connection: "keep-alive",
        "content-type": "application/json",
        host: "gateway.example",
        "transfer-encoding": "chunked",
        "x-api-key": "gateway-token",
        "x-provider-name": "provider-a",
        "anthropic-version": "2023-06-01",
      },
      body: "{}",
    });

    const upstreamRequest = withHeaders(request, {
      authorization: "Bearer provider-token",
    });

    expect(upstreamRequest.headers.get("authorization")).toBe("Bearer provider-token");
    expect(upstreamRequest.headers.get("anthropic-version")).toBe("2023-06-01");
    expect(upstreamRequest.headers.get("content-type")).toBe("application/json");
    for (const header of [
      "connection",
      "host",
      "transfer-encoding",
      "x-api-key",
      "x-provider-name",
    ]) {
      expect(upstreamRequest.headers.get(header)).toBeNull();
    }
  });
});
