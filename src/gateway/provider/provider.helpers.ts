import { ProtocolType } from "../protocol/protocol.types";
import { filter } from "es-toolkit/fp";
import { Provider } from "./provider.types";

export const forEnabled = filter(({ enabled }: Provider) => enabled);

export const forProtocol = (type: ProtocolType) =>
  filter(({ protocols }: Provider) => protocols.includes(type));

export const forModel = (modelId: string) =>
  filter(({ models: modelIds }: Provider) => modelIds.includes(modelId));

/** Selection strategy placeholder: use the first eligible provider for now. */
export const selectProvider = (providers: readonly Provider[]): Provider | undefined =>
  providers[0];

export const ensureProvidersExist = (providers: readonly Provider[]) => {
  if (providers.length === 0) throw new Error("No providers configured");
  return providers;
};
