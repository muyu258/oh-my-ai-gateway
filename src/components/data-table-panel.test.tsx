import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DataTablePanel, hasHorizontalScrollOffset } from "./data-table-panel";

describe("DataTablePanel horizontal scroll state", () => {
  test("starts without the scrolled marker", () => {
    const markup = renderToStaticMarkup(<DataTablePanel header="Header">Body</DataTablePanel>);

    expect(markup).toContain("data-table-panel");
    expect(markup).not.toContain("data-scrolled");
  });

  test("shows the pinned boundary only while content is hidden to the left", () => {
    expect(hasHorizontalScrollOffset(0)).toBe(false);
    expect(hasHorizontalScrollOffset(1)).toBe(true);
    expect(hasHorizontalScrollOffset(120)).toBe(true);
    expect(hasHorizontalScrollOffset(0)).toBe(false);
  });
});
