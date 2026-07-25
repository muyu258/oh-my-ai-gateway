import { GatewayError } from "#/infra/gateway/errors/gateway-error";
import { Provider } from "#/infra/gateway/provider/provider.types";
import { ProtocolType } from "../protocol.types";

export type TransformerParams = {
  request: Request;
  options: {
    baseUrl?: string;
    endpoint?: string;
    token: string;
    model?: string;
  };
};

export type ParsedUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
};

/* ================================================================================ */

/** The defaults and request/response adapters that define a complete protocol. */
export interface ProtocolAdapter {
  defaultEndpoint: string;
  defaultBaseUrl: string;
  protocolType: ProtocolType;

  /* ================================================================================ */

  /** Reads the model used for provider selection without consuming the original body. */
  getModel: (request: Request) => Promise<string>;
  /** Reads the gateway token from the protocol-specific authentication header. */
  getToken: (request: Request) => string;
  /** Replaces the upstream URL and credentials while preserving the protocol payload. */
  transformer: (params: TransformerParams) => Request;

  /* ================================================================================ */

  /** Parses a response, returning the parsed usage. */
  parseJsonResponse: (response: Response) => Promise<ParsedUsage>;
  parseStreamingResponse: (response: Response) => Promise<ParsedUsage>;
  /** Creates the protocol-specific models response. */
  createModelsResponse: (providers: Provider[]) => Response;
  /** Converts an internal gateway error into a protocol-specific error response. */
  createErrorResponse: (error: GatewayError) => Response;
}
