import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { UsageRecordDetails, UsageRecordRow } from "./usage-record-row";

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

  test("marks an interactive row for the shared keyboard focus style", () => {
    const markup = renderToStaticMarkup(
      <table>
        <tbody>
          <UsageRecordRow recordId="usage-1" recordJson="{}">
            <td>Usage record</td>
          </UsageRecordRow>
        </tbody>
      </table>,
    );

    expect(markup).toContain('data-focus-control="true"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).not.toContain("focus-visible:bg");
    expect(markup).not.toContain("focus-visible:ring");
  });
});
