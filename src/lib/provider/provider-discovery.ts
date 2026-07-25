import { z } from "zod";

import { adapters } from "../protocol/adapter";
import { appendEndpoint } from "../protocol/adapter/adapter.helpers";
import { ProtocolType } from "../protocol/protocol.types";
import type { Provider } from "./provider.types";

const modelListSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1) })),
});

const discoveryHeaders = (provider: Provider, protocol: ProtocolType): Headers => {
  const headers = new Headers({ accept: "application/json" });

  if (protocol === ProtocolType.Anthropic) {
    headers.set("anthropic-version", "2023-06-01");
    headers.set("x-api-key", provider.token);
  } else {
    headers.set("authorization", `Bearer ${provider.token}`);
  }

  return headers;
};

const responseError = async (response: Response): Promise<string> => {
  const body = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 240);
  return body || response.statusText || `HTTP ${response.status}`;
};

const testPayload = (protocol: ProtocolType, model: string): Record<string, unknown> => {
  if (protocol === ProtocolType.OpenaiResponse) {
    return { model, input: "Reply with OK.", stream: false };
  }

  if (protocol === ProtocolType.Anthropic) {
    return {
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "Reply with OK." }],
      stream: false,
    };
  }

  return {
    model,
    messages: [{ role: "user", content: "Reply with OK." }],
    stream: false,
  };
};

export const testProviderProtocol = async (
  provider: Provider,
  protocol: ProtocolType,
  gateway: { baseUrl: string; token: string },
): Promise<{ latencyMs: number; model: string }> => {
  if (!provider.protocols[protocol]?.enabled)
    throw new Error("Enable this protocol before testing it.");

  const model = provider.testModel?.trim() || provider.models.at(0)?.trim();
  if (!model) throw new Error("Add at least one model before testing this protocol.");

  const adapter = adapters[protocol];
  const headers = discoveryHeaders({ ...provider, token: gateway.token }, protocol);
  headers.set("content-type", "application/json");
  headers.set("x-provider-name", provider.name);
  headers.set("user-agent", "gateway/test");
  const startedAt = performance.now();
  const response = await fetch(appendEndpoint(gateway.baseUrl, adapter.defaultEndpoint), {
    method: "POST",
    headers,
    body: JSON.stringify(testPayload(protocol, model)),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Gateway returned ${response.status}: ${await responseError(response)}`);
  }

  await response.arrayBuffer();
  return {
    latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
    model,
  };
};

export const discoverProviderModels = async (
  provider: Provider,
  protocol: ProtocolType,
): Promise<{ latencyMs: number; models: string[] }> => {
  if (!provider.protocols[protocol]?.enabled)
    throw new Error("Enable this protocol before testing it.");

  const baseUrl = provider.baseUrl ?? adapters[protocol].defaultBaseUrl;
  const url = appendEndpoint(baseUrl, "/v1/models");
  const startedAt = performance.now();
  const response = await fetch(url, {
    headers: discoveryHeaders(provider, protocol),
    signal: AbortSignal.timeout(15_000),
  });
  const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));

  if (!response.ok) {
    throw new Error(`Provider returned ${response.status}: ${await responseError(response)}`);
  }

  const payload: unknown = await response.json();
  const parsed = modelListSchema.safeParse(payload);
  if (!parsed.success) throw new Error("Provider returned an unsupported models-list response.");

  return {
    latencyMs,
    models: [...new Set(parsed.data.data.map(({ id }) => id))].sort((left, right) =>
      left.localeCompare(right),
    ),
  };
};
