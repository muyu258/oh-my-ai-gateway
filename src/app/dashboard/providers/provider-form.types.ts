import type { ProtocolType } from "#/infra/gateway/protocol/protocol.types";

export type ProviderFormInput = {
  name: string;
  models: string[];
  protocols: ProtocolType[];
  protocolEndpoints: Partial<Record<ProtocolType, string>>;
  websiteUrl: string;
  baseUrl: string;
  providerToken: string;
  enabled: boolean;
};

export type ProviderActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export type ProviderConnectionResult =
  | {
      ok: true;
      latencyMs: number;
      models: string[];
    }
  | {
      ok: false;
      error: string;
    };

export type ProviderTestResult =
  | {
      ok: true;
      latencyMs: number;
      model: string;
    }
  | {
      ok: false;
      error: string;
    };
