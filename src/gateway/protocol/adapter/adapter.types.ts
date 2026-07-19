import { ProtocolType } from "../protocol.types";

export type RequestAdapterParams = {
  request: Request;
  options: {
    baseUrl?: string;
    endpoint?: string;
    apiKey: string;
    model?: string;
  };
};

export interface RequestAdapter {
  getModel: (request: Request) => Promise<string>;
  requestTransformer: (params: RequestAdapterParams) => Request;
}

export interface ResponseAdapter {
  responseTransformer: (response: Response) => Response;
}

export interface ProtocolAdapter {
  defaultEndpoint: string;
  defaultBaseUrl: string;
  protocolType: ProtocolType;
  requestAdapter: RequestAdapter;
  responseAdapter: ResponseAdapter;
}
