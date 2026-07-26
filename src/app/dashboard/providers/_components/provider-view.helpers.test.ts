import { describe, expect, test } from "bun:test";

import type { ProviderSummary } from "#/lib/database/provider.repository";
import {
  getDiscoveredModelState,
  mergeModels,
  moveProviderPriorities,
} from "./provider-view.helpers";

const summary = (id: string, order: number): ProviderSummary => ({
  id,
  name: id,
  order,
  models: [],
  testModel: null,
  protocols: {},
  websiteUrl: null,
  baseUrl: null,
  enabled: true,
  costMultiplier: "1",
  pricingOverrides: {},
  updatedAt: new Date(0),
  averageResponseTimeMs: null,
  inputTokens: null,
  outputTokens: null,
  cacheReadInputTokens: null,
  costMicros: null,
  costComplete: true,
});

describe("provider priority view helpers", () => {
  test("moves downward after the target and shifts global intermediates upward", () => {
    const providers = [summary("visible-a", 1), summary("hidden", 2), summary("visible-b", 3)];
    expect(
      moveProviderPriorities(providers, "visible-a", "visible-b", "after").map(({ id, order }) => [
        id,
        order,
      ]),
    ).toEqual([
      ["hidden", 1],
      ["visible-b", 2],
      ["visible-a", 3],
    ]);
    expect(providers.map(({ id }) => id)).toEqual(["visible-a", "hidden", "visible-b"]);
  });

  test("moves upward before the target and supports the first and last boundaries", () => {
    const providers = [summary("a", 3), summary("b", 8), summary("c", 12), summary("d", 20)];

    expect(
      moveProviderPriorities(providers, "d", "b", "before").map(({ id, order }) => [id, order]),
    ).toEqual([
      ["a", 3],
      ["d", 8],
      ["b", 12],
      ["c", 20],
    ]);
    expect(moveProviderPriorities(providers, "d", "a", "before").map(({ id }) => id)).toEqual([
      "d",
      "a",
      "b",
      "c",
    ]);
    expect(moveProviderPriorities(providers, "a", "d", "after").map(({ id }) => id)).toEqual([
      "b",
      "c",
      "d",
      "a",
    ]);
  });

  test("leaves the original snapshot available for invalid, no-op, and failed moves", () => {
    const providers = [summary("a", 1), summary("b", 2), summary("c", 3)];
    expect(moveProviderPriorities(providers, "a", "a", "before")).toBe(providers);
    expect(moveProviderPriorities(providers, "a", "missing", "after")).toBe(providers);
    expect(moveProviderPriorities(providers, "a", "b", "before")).toBe(providers);

    const optimistic = moveProviderPriorities(providers, "a", "c", "after");
    expect(optimistic).not.toBe(providers);
    expect(providers.map(({ id, order }) => [id, order])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });
});

describe("discovered model helpers", () => {
  const existing = new Set(["existing"]);
  const selected = new Set(["selected"]);

  test("distinguishes existing, selected, and available models", () => {
    expect(getDiscoveredModelState("existing", existing, selected)).toBe("existing");
    expect(getDiscoveredModelState("selected", existing, selected)).toBe("selected");
    expect(getDiscoveredModelState("available", existing, selected)).toBe("available");
  });

  test("merges only the selected models into a sorted, deduplicated draft", () => {
    expect(mergeModels(["zeta", "alpha"], ["beta", "alpha"])).toEqual(["alpha", "beta", "zeta"]);
  });
});
