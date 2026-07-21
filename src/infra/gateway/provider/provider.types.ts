import { ProtocolType } from "../protocol/protocol.types";

export type Provider = {
  id: string;
  name: string;
  models: readonly string[];
  protocols: readonly ProtocolType[];
  baseUrl?: string;
  providerToken: string;
  enabled: boolean;
};
