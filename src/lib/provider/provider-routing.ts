import type { ProtocolType } from "#/lib/protocol/protocol.types";
import type { Provider } from "./provider.types";
import { resolveProviderModel } from "./provider-models";

export type ProviderSelection = {
  provider: Provider;
  requestedModel: string;
  upstreamModel: string;
};

export const selectProvider = (
  providers: Provider[],
  protocolType: ProtocolType,
  model: string,
  providerId?: string | null,
): ProviderSelection | undefined => {
  const matchingProviders = providers.flatMap((provider) => {
    const resolved = resolveProviderModel(provider.models, model);
    return provider.enabled && provider.protocols[protocolType]?.enabled && resolved
      ? [{ provider, ...resolved }]
      : [];
  });
  return providerId
    ? matchingProviders.find(({ provider }) => provider.id === providerId)
    : matchingProviders.at(0);
};
