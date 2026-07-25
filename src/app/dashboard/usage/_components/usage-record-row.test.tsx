import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { UsageRecordDetails } from "./usage-record-row";

describe("UsageRecordDetails", () => {
  test("renders only usage JSON without requesting stored content", () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = mock(async () => new Response());
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const markup = renderToStaticMarkup(
        <UsageRecordDetails
          recordJson={JSON.stringify({ id: "usage-1", inputTokens: 12 }, null, 2)}
          onClose={() => {}}
        />,
      );

      expect(markup).toContain("usage-1");
      expect(markup).toContain("inputTokens");
      expect(markup).toContain("Copy usage JSON");
      expect(markup).not.toContain("original request");
      expect(markup).not.toContain("original response");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
