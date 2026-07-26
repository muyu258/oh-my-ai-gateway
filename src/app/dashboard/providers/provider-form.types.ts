import type { ProviderRecord } from "#/lib/database/drizzle/schema";

export type ProviderFormInput = Pick<
  ProviderRecord,
  "name" | "models" | "protocols" | "enabled" | "testProtocol"
> & {
  testModel: NonNullable<ProviderRecord["testModel"]>;
  websiteUrl: NonNullable<ProviderRecord["websiteUrl"]>;
  baseUrl: NonNullable<ProviderRecord["baseUrl"]>;
  providerToken: ProviderRecord["token"];
  costMultiplier: ProviderRecord["costMultiplier"];
  pricingOverrides: string;
};

export type ProviderActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export type CreateProviderActionResult =
  | { ok: true; providerId: string }
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
      upstreamModel: string;
      protocol: import("#/lib/protocol/protocol.types").ProtocolType;
    }
  | {
      ok: false;
      error: string;
    };
