import { ProtocolType } from "../protocol/protocol.types";
import { GatewayError, GatewayErrorCode } from "../errors/gateway-error";
import { filter } from "es-toolkit/fp";
import { Provider } from "./provider.types";
import { invariant } from "es-toolkit";

export const forEnabled = filter(({ enabled }: Provider) => enabled);

export const forProtocol = (type: ProtocolType) => forProtocols([type]);

export const forProtocols = (types: ProtocolType[]) =>
  filter(({ protocols }: Provider) => types.some((type) => protocols[type]?.enabled));

export const forModel = (model: string) => filter(({ models }: Provider) => models.includes(model));

export const providerSelectionOptions = (request: Request): { id: string | null } => ({
  id: request.headers.get("x-provider-id"),
});

export const selectProvider = (
  providers: Provider[],
  options: {
    id?: string | null;
  },
): Provider => {
  let provider: Provider | undefined;

  if (options.id) {
    provider = providers.find(({ id }) => id === options.id);
  } else {
    provider = providers.at(0);
  }

  invariant(
    provider,
    new GatewayError(GatewayErrorCode.RouteNotFound, "No provider matches this protocol and model"),
  );

  return provider;
};

export const collectModels = (providers: Provider[]): string[] =>
  [...new Set(providers.flatMap(({ models }) => models))].sort((left, right) =>
    left.localeCompare(right),
  );
