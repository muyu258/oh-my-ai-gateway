import { describe, expect, test } from "bun:test";

import { reorderProviders } from "../provider-order";

const providers = [
  { id: "alpha", order: 1 },
  { id: "bravo", order: 2 },
  { id: "charlie", order: 3 },
  { id: "delta", order: 4 },
];

describe("provider priority ordering", () => {
  test("moves a provider after another provider while preserving unaffected order", () => {
    expect(reorderProviders(providers, "alpha", "charlie", "after")).toEqual([
      { id: "bravo", order: 2 },
      { id: "charlie", order: 3 },
      { id: "alpha", order: 1 },
      { id: "delta", order: 4 },
    ]);
  });

  test("recognizes an already satisfied placement", () => {
    expect(reorderProviders(providers, "alpha", "bravo", "before")).toEqual(providers);
    expect(reorderProviders(providers, "bravo", "alpha", "after")).toEqual(providers);
  });

  test("rejects identical and missing provider IDs", () => {
    expect(() => reorderProviders(providers, "alpha", "alpha", "before")).toThrow(
      "Provider IDs must be different",
    );
    expect(() => reorderProviders(providers, "alpha", "missing", "after")).toThrow(
      "Both providers must exist",
    );
  });
});
