import { ProtocolType } from "../protocol/protocol.types";

export type Provider = {
  name: string;
  models: readonly string[];
  testModel?: string;
  protocols: readonly ProtocolType[];
  protocolEndpoints?: Partial<Record<ProtocolType, string>>;
  websiteUrl?: string;
  baseUrl?: string;
  providerToken: string;
  enabled: boolean;
};
