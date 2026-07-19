import { pipe } from "es-toolkit/fp";

import {
  ensureProvidersExist,
  forEnabled,
  forModel,
  forProtocol,
  selectProvider,
} from "../provider/provider.helpers";
import { providers } from "../provider/provider.config";
import { ProtocolAdapter } from "../protocol/adapter/adapter.types";

export const handleGatewayRequest = async ({
  request,
  adapter: { protocolType, requestAdapter },
}: {
  request: Request;
  adapter: ProtocolAdapter;
}): Promise<Response> => {
  const model = await requestAdapter.getModel(request);
  const _provider = pipe(
    providers,
    forEnabled,
    forProtocol(protocolType),
    forModel(model),
    ensureProvidersExist,
    selectProvider,
  );

  throw new Error("Gateway provider forwarding is not implemented.");
};
