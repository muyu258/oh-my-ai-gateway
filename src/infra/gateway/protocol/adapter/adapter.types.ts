import { GatewayError } from "#/infra/gateway/errors/gateway-error";
import { Provider } from "#/infra/gateway/provider/provider.types";
import { ProtocolType } from "../protocol.types";

/* ================================================================================ */

/** The original request and routing options used to build an upstream request. */
export type RequestAdapterParams = {
  request: Request;
  options: {
    baseUrl?: string;
    endpoint?: string;
    providerToken: string;
    model?: string;
  };
};

/** Adapts a client request to the selected upstream protocol. */
export interface RequestAdapter {
  /** Reads the model used for provider selection without consuming the original body. */
  getModel: (request: Request) => Promise<string>;
  /** Reads the gateway token from the protocol-specific authentication header. */
  getGatewayToken: (request: Request) => string;
  /** Replaces the upstream URL and credentials while preserving the protocol payload. */
  requestTransformer: (params: RequestAdapterParams) => Request;
}

/* ================================================================================ */

/** Protocol-independent metrics extracted from a complete response payload. */
export type ResponseMeta = {
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
    cost?: string;
    costDetails?: Record<string, unknown>;
  };
};

/** A single JSON event parsed from an SSE frame. */
export type SseEvent = {
  /** The SSE event field; some protocols provide the event type only in data.type. */
  event?: string;
  /** The data field after JSON parsing. */
  data: unknown;
};

/**
 * A protocol-specific SSE aggregator.
 * The shared layer parses SSE framing; the adapter reconstructs the complete response payload.
 */
export interface SseResponseCollector {
  /** Receives parsed SSE events in upstream order. */
  append: (event: SseEvent) => void;
  /** Returns the aggregated protocol response after the stream ends normally. */
  complete: () => unknown;
}

/** The mutually exclusive terminal states of response collection. */
export type ResponseCompletion =
  | { type: "completed"; payload: unknown }
  | { type: "failed"; error: unknown }
  | { type: "cancelled"; reason: unknown };

/**
 * Combines the client-facing response with its asynchronous collection result.
 * The response can be returned immediately; completion resolves when collection terminates.
 */
export type CollectedResponse = {
  /** The client-facing response; SSE responses are wrapped while preserving their bytes. */
  forwardedResponse: Response;
  /** The complete payload or the stream failure/cancellation state. */
  completion: Promise<ResponseCompletion>;
  /** Milliseconds from gateway request start until the first non-empty response body chunk. */
  timeToFirstByteMs: Promise<number | undefined>;
  /** Whether this response is collected using the SSE lifecycle. */
  isStream: boolean;
};

/** Defines protocol-specific response creation, SSE aggregation, and metadata extraction. */
export interface ResponseAdapter {
  /** Creates the protocol-specific models response. */
  createModelsResponse: (providers: Provider[]) => Response;
  /** Converts an internal gateway error into a protocol-specific error response. */
  createErrorResponse: (error: GatewayError) => Response;
  /** Creates an isolated, stateful collector for each SSE response. */
  createSseResponseCollector: () => SseResponseCollector;
  /** Extracts normalized metrics from either a direct or aggregated response payload. */
  extractResponseMetadata: (payload: unknown) => ResponseMeta;
}

/* ================================================================================ */

/** The defaults and request/response adapters that define a complete protocol. */
export interface ProtocolAdapter {
  defaultEndpoint: string;
  defaultBaseUrl: string;
  protocolType: ProtocolType;
  requestAdapter: RequestAdapter;
  responseAdapter: ResponseAdapter;
}
