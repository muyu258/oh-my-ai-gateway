import { describe, expect, test } from "bun:test";

import { ProtocolType } from "#/lib/protocol/protocol.types";
import { selectProvider } from "../provider-routing";
import type { Provider } from "../provider.types";

const provider = (id: string, order: number, enabled = true): Provider => ({
  id,
  name: id,
  order,
  models: ["shared-model"],
  testModel: "shared-model",
  protocols: {
    [ProtocolType.OpenaiCompatible]: { endpoint: "", enabled: true },
  },
  websiteUrl: null,
  baseUrl: null,
  token: "secret",
  enabled,
  costMultiplier: "1",
  pricingOverrides: {},
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("provider routing priority", () => {
  const providers = [provider("priority-1", 1), provider("priority-2", 2)];

  test("selects the first eligible provider from repository order", () => {
    expect(selectProvider(providers, ProtocolType.OpenaiCompatible, "shared-model")?.id).toBe(
      "priority-1",
    );
  });

  test("keeps explicit provider selection and skips disabled providers", () => {
    expect(
      selectProvider(providers, ProtocolType.OpenaiCompatible, "shared-model", "priority-2")?.id,
    ).toBe("priority-2");
    expect(
      selectProvider(
        [provider("disabled", 1, false), provider("enabled", 2)],
        ProtocolType.OpenaiCompatible,
        "shared-model",
      )?.id,
    ).toBe("enabled");
  });
});
