import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DataTablePanel, hasHiddenContentToRight } from "./data-table-panel";

describe("DataTablePanel horizontal scroll state", () => {
  test("starts without the hidden-right marker before layout", () => {
    const markup = renderToStaticMarkup(<DataTablePanel header="Header">Body</DataTablePanel>);

    expect(markup).toContain("data-table-panel");
    expect(markup).not.toContain("data-hidden-right");
  });

  test("shows the pinned boundary while content remains hidden to the right", () => {
    expect(hasHiddenContentToRight(0, 800, 980)).toBe(true);
    expect(hasHiddenContentToRight(100, 800, 980)).toBe(true);
    expect(hasHiddenContentToRight(179, 800, 980)).toBe(false);
    expect(hasHiddenContentToRight(180, 800, 980)).toBe(false);
    expect(hasHiddenContentToRight(0, 980, 980)).toBe(false);
  });
});
