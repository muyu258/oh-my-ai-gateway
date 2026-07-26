import type { ProtocolType } from "#/lib/protocol/protocol.types";
import type { Provider } from "./provider.types";

export const selectProvider = (
  providers: Provider[],
  protocolType: ProtocolType,
  model: string,
  providerId?: string | null,
): Provider | undefined => {
  const matchingProviders = providers.filter(
    (provider) =>
      provider.enabled &&
      provider.protocols[protocolType]?.enabled &&
      provider.models.includes(model),
  );
  return providerId
    ? matchingProviders.find(({ id }) => id === providerId)
    : matchingProviders.at(0);
};
