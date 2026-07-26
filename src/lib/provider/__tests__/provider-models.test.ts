import { describe, expect, test } from "bun:test";

import {
  addProviderAlias,
  getPublicModels,
  getTestModel,
  normalizeProviderModels,
  removeProviderModelName,
  resolveProviderModel,
} from "../provider-models";

describe("provider models", () => {
  test("normalizes and sorts real models and aliases", () => {
    expect(
      normalizeProviderModels({
        " zeta ": { aliases: [" fast ", "default"] },
        alpha: { aliases: [] },
      }),
    ).toEqual({
      alpha: { aliases: [] },
      zeta: { aliases: ["default", "fast"] },
    });
  });

  test("rejects aliases that conflict with any public model name", () => {
    expect(() =>
      normalizeProviderModels({ alpha: { aliases: ["beta"] }, beta: { aliases: [] } }),
    ).toThrow("unique");
    expect(() =>
      normalizeProviderModels({ alpha: { aliases: ["shared"] }, beta: { aliases: ["shared"] } }),
    ).toThrow("unique");
    expect(() => normalizeProviderModels({ alpha: { aliases: [" "] } })).toThrow("empty");
  });

  test("expands public names and resolves aliases directly to real models", () => {
    const models = {
      zeta: { aliases: ["default", "fast"] },
      alpha: { aliases: ["aardvark"] },
    };
    expect(getPublicModels(models)).toEqual(["alpha", "zeta", "aardvark", "default", "fast"]);
    expect(resolveProviderModel(models, " fast ")).toEqual({
      requestedModel: "fast",
      upstreamModel: "zeta",
      isAlias: true,
    });
  });

  test("uses an alias target's real model and cascades real-model deletion", () => {
    const models = addProviderAlias({ alpha: { aliases: ["fast"] } }, "fast", "default");
    expect(models).toEqual({ alpha: { aliases: ["default", "fast"] } });
    expect(removeProviderModelName(models, "fast")).toEqual({
      alpha: { aliases: ["default"] },
    });
    expect(removeProviderModelName(models, "alpha")).toEqual({});
  });

  test("keeps a valid public test name and otherwise falls back to the first real model", () => {
    const models = { zeta: { aliases: ["alias"] }, alpha: { aliases: [] } };
    expect(getTestModel(models, "alias")).toBe("alias");
    expect(getTestModel(models, "missing")).toBe("alpha");
  });
});
