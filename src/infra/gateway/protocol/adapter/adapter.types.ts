import { GatewayError } from "#/infra/gateway/errors/gateway-error";
import { Provider } from "#/infra/gateway/provider/provider.types";
import { ProtocolType } from "../protocol.types";

export type RequestAdapterParams = {
  request: Request;
  options: {
    baseUrl?: string;
    endpoint?: string;
    providerToken: string;
    model?: string;
  };
};

export interface RequestAdapter {
  getModel: (request: Request) => Promise<string>;
  getGatewayToken: (request: Request) => string;
  requestTransformer: (params: RequestAdapterParams) => Request;
}

export interface ResponseAdapter {
  createModelsResponse: (providers: Provider[]) => Response;
  createErrorResponse: (error: GatewayError) => Response;
  responseTransformer: (response: Response) => Response;
}

export interface ProtocolAdapter {
  defaultEndpoint: string;
  defaultBaseUrl: string;
  protocolType: ProtocolType;
  requestAdapter: RequestAdapter;
  responseAdapter: ResponseAdapter;
}
