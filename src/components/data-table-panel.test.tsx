import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DataTableCell, DataTableHead } from "./data-table";
import {
  DataTablePanel,
  hasHiddenContentToLeft,
  hasHiddenContentToRight,
} from "./data-table-panel";

describe("DataTablePanel horizontal scroll state", () => {
  test("starts without the hidden-right marker before layout", () => {
    const markup = renderToStaticMarkup(<DataTablePanel header="Header">Body</DataTablePanel>);

    expect(markup).toContain("data-table-panel");
    expect(markup).toContain("flex min-h-full flex-col");
    expect(markup).not.toContain("data-hidden-right");
  });

  test("shows the pinned boundary while content remains hidden to the right", () => {
    expect(hasHiddenContentToRight(0, 800, 980)).toBe(true);
    expect(hasHiddenContentToRight(100, 800, 980)).toBe(true);
    expect(hasHiddenContentToRight(179, 800, 980)).toBe(false);
    expect(hasHiddenContentToRight(180, 800, 980)).toBe(false);
    expect(hasHiddenContentToRight(0, 980, 980)).toBe(false);
  });

  test("shows the pinned boundary after content becomes hidden to the left", () => {
    expect(hasHiddenContentToLeft(0)).toBe(false);
    expect(hasHiddenContentToLeft(1)).toBe(false);
    expect(hasHiddenContentToLeft(2)).toBe(true);
    expect(hasHiddenContentToLeft(180)).toBe(true);
  });

  test("renders direction-specific pinned classes and offsets", () => {
    const leftHead = renderToStaticMarkup(
      <DataTableHead pinned="left" pinOffset={12}>
        Left
      </DataTableHead>,
    );
    const rightCell = renderToStaticMarkup(
      <DataTableCell pinned="right" pinOffset="2rem">
        Right
      </DataTableCell>,
    );

    expect(leftHead).toContain("data-table-pinned-left");
    expect(leftHead).toContain("data-table-pinned-boundary-left");
    expect(leftHead).toContain("left:12px");
    expect(leftHead).not.toContain("right:12px");
    expect(rightCell).toContain("data-table-pinned-right");
    expect(rightCell).toContain("data-table-pinned-boundary-right");
    expect(rightCell).toContain("right:2rem");
    expect(rightCell).not.toContain("left:2rem");
  });

  test("keeps pinned offsets while allowing the boundary marker to be disabled", () => {
    const markup = renderToStaticMarkup(
      <DataTableCell pinned="right" pinOffset={40} pinnedBoundary={false}>
        Right
      </DataTableCell>,
    );

    expect(markup).toContain("data-table-pinned-right");
    expect(markup).toContain("right:40px");
    expect(markup).not.toContain("data-table-pinned-boundary-right");
  });
});
