import { describe, expect, test } from "bun:test";

import { forwardResponse } from "../proxy.helpers";

describe("forwardResponse", () => {
  test("removes decoded transport headers and preserves the response", async () => {
    const upstreamResponse = new Response('{"ok":true}', {
      status: 202,
      statusText: "Accepted",
      headers: {
        "content-encoding": "gzip",
        "content-length": "31",
        "content-type": "application/json",
        "transfer-encoding": "chunked",
        "x-request-id": "request-1",
      },
    });

    const response = forwardResponse(upstreamResponse);

    expect(response.status).toBe(202);
    expect(response.statusText).toBe("Accepted");
    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("transfer-encoding")).toBeNull();
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("x-request-id")).toBe("request-1");
    expect(await response.json()).toEqual({ ok: true });
  });
});
