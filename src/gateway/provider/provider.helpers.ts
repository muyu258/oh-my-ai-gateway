import { ProtocolType } from "../protocol/protocol.types";
import { GatewayError, GatewayErrorCode } from "../errors/gateway-error";
import { filter } from "es-toolkit/fp";
import { Provider } from "./provider.types";
import { invariant } from "es-toolkit";

export const forEnabled = filter(({ enabled }: Provider) => enabled);

export const forProtocol = (type: ProtocolType) =>
  filter(({ protocols }: Provider) => protocols.includes(type));

export const forModel = (model: string) =>
  filter(({ models: modelIds }: Provider) => modelIds.includes(model));

/** Selection strategy placeholder: use the first eligible provider for now. */
export const selectProvider = (providers: Provider[]): Provider => {
  const provider = providers[0];
  invariant(
    provider,
    new GatewayError(GatewayErrorCode.RouteNotFound, "No provider matches this protocol and model"),
  );

  return provider;
};
