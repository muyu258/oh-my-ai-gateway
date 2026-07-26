import { describe, expect, test } from "bun:test";

import { GatewayErrorCode } from "../errors/gateway-error";
import { ProtocolType } from "../protocol/protocol.types";
import type { Provider } from "./provider.types";
import { providerSelectionOptions, selectProvider } from "./provider.helpers";

const createProvider = (id: string, name: string): Provider => ({
  id,
  name,
  models: ["test-model"],
  testModel: "test-model",
  protocols: { [ProtocolType.OpenaiCompatible]: { endpoint: "", enabled: true } },
  websiteUrl: null,
  baseUrl: null,
  token: "secret",
  enabled: true,
  costMultiplier: "1",
  pricingOverrides: {},
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const first = createProvider("00000000-0000-4000-8000-000000000001", "First");
const second = createProvider("00000000-0000-4000-8000-000000000002", "Second");

describe("provider selection", () => {
  test("selects the exact UUID when supplied", () => {
    expect(selectProvider([first, second], { id: second.id })).toBe(second);
  });

  test("selects the first filtered provider by default", () => {
    expect(selectProvider([first, second], { id: null })).toBe(first);
  });

  test("rejects an unknown UUID", () => {
    try {
      selectProvider([first, second], { id: "00000000-0000-4000-8000-000000000099" });
      throw new Error("Expected provider selection to fail");
    } catch (error) {
      expect(error).toMatchObject({ code: GatewayErrorCode.RouteNotFound });
    }
  });

  test("ignores the removed x-provider-name header", () => {
    const request = new Request("http://gateway.test/v1/chat/completions", {
      headers: { "x-provider-name": second.name },
    });

    expect(providerSelectionOptions(request)).toEqual({ id: null });
    expect(selectProvider([first, second], providerSelectionOptions(request))).toBe(first);
  });
});
