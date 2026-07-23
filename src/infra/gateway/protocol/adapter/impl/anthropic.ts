import { invariant } from "es-toolkit";
import { collectModels } from "#/infra/gateway/provider/provider.helpers";
import { GatewayErrorCode } from "#/infra/gateway/errors/gateway-error";
import { ProtocolType } from "../../protocol.types";
import { appendEndpoint, withProviderHeaders } from "../adapter.helpers";
import type {
  ProtocolAdapter,
  RequestAdapter,
  ResponseAdapter,
  SseResponseCollector,
} from "../adapter.types";
import { z } from "zod";

const defaultEndpoint = "/v1/messages";
const defaultBaseUrl = "https://api.anthropic.com";
const protocolType = ProtocolType.Anthropic;

const requestSchema = z.object({ model: z.string().min(1) });
const responseUsageSchema = z
  .object({
    usage: z
      .object({
        input_tokens: z.number().optional(),
        output_tokens: z.number().optional(),
        cache_read_input_tokens: z.number().optional(),
      })
      .optional(),
  })
  .transform(({ usage }) =>
    usage
      ? {
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cachedInputTokens: usage.cache_read_input_tokens,
          },
        }
      : {},
  );

const errorTypeByCode: Record<GatewayErrorCode, string> = {
  [GatewayErrorCode.InvalidRequest]: "invalid_request_error",
  [GatewayErrorCode.RouteNotFound]: "not_found_error",
  [GatewayErrorCode.UpstreamNetworkError]: "api_error",
  [GatewayErrorCode.UpstreamAborted]: "api_error",
  [GatewayErrorCode.InternalError]: "api_error",
};

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : undefined;

const appendString = (target: JsonRecord, key: string, value: unknown): void => {
  if (typeof value !== "string") return;
  target[key] = `${typeof target[key] === "string" ? target[key] : ""}${value}`;
};

const createSseResponseCollector = (): SseResponseCollector => {
  let message: JsonRecord = {};
  let content: unknown[] = [];
  let usage: JsonRecord = {};
  const partialJsonByIndex = new Map<number, string>();

  const getContentBlock = (index: number): JsonRecord => {
    const current = asRecord(content[index]);
    if (current) return current;

    const created: JsonRecord = {};
    content[index] = created;
    return created;
  };

  return {
    append: ({ event, data }) => {
      const payload = asRecord(data);
      if (!payload) return;

      const eventType = typeof payload.type === "string" ? payload.type : event;
      if (eventType === "error") throw payload;
      if (eventType === "message_start") {
        const startedMessage = asRecord(payload.message);
        if (!startedMessage) return;

        message = { ...startedMessage };
        content = Array.isArray(startedMessage.content)
          ? startedMessage.content.map((block) => {
              const record = asRecord(block);
              return record ? { ...record } : block;
            })
          : [];
        usage = { ...(asRecord(startedMessage.usage) ?? {}) };
        return;
      }

      if (eventType === "content_block_start" && typeof payload.index === "number") {
        const block = asRecord(payload.content_block);
        if (block) content[payload.index] = { ...block };
        return;
      }

      if (eventType === "content_block_delta" && typeof payload.index === "number") {
        const delta = asRecord(payload.delta);
        if (!delta) return;

        const block = getContentBlock(payload.index);
        switch (delta.type) {
          case "text_delta":
            appendString(block, "text", delta.text);
            break;
          case "thinking_delta":
            appendString(block, "thinking", delta.thinking);
            break;
          case "signature_delta":
            appendString(block, "signature", delta.signature);
            break;
          case "input_json_delta": {
            const current = partialJsonByIndex.get(payload.index) ?? "";
            if (typeof delta.partial_json === "string") {
              partialJsonByIndex.set(payload.index, current + delta.partial_json);
            }
            break;
          }
          case "citations_delta":
            if (delta.citation !== undefined) {
              const citations = Array.isArray(block.citations) ? block.citations : [];
              block.citations = [...citations, delta.citation];
            }
            break;
          default:
            for (const [key, value] of Object.entries(delta)) {
              if (key === "type") continue;
              if (typeof value === "string") appendString(block, key, value);
              else if (value !== null) block[key] = value;
            }
        }
        return;
      }

      if (eventType === "message_delta") {
        const delta = asRecord(payload.delta);
        if (delta) {
          for (const [key, value] of Object.entries(delta)) {
            if (key !== "type") message[key] = value;
          }
        }

        const deltaUsage = asRecord(payload.usage);
        if (deltaUsage) usage = { ...usage, ...deltaUsage };
      }
    },
    complete: () => {
      for (const [index, partialJson] of partialJsonByIndex) {
        const block = getContentBlock(index);
        try {
          const input: unknown = JSON.parse(partialJson);
          block.input = input;
        } catch {
          block.input_json_delta = partialJson;
        }
      }

      return {
        ...message,
        content,
        ...(Object.keys(usage).length ? { usage } : {}),
      };
    },
  };
};

const requestAdapter: RequestAdapter = {
  getModel: async (request: Request): Promise<string> => {
    const payload: unknown = await request.clone().json();
    return requestSchema.parse(payload).model;
  },
  getGatewayToken: ({ headers }: Request): string => {
    const token = headers.get("x-api-key");
    invariant(token, new Error("Anthropic gateway token is required"));
    return token;
  },
  requestTransformer: ({ request, options }) => {
    const { providerToken, baseUrl = defaultBaseUrl, endpoint = defaultEndpoint } = options;
    const upstreamRequest = new Request(appendEndpoint(baseUrl, endpoint), request);
    return withProviderHeaders(upstreamRequest, {
      "x-api-key": providerToken,
    });
  },
};

const responseAdapter: ResponseAdapter = {
  createModelsResponse: (providers) => {
    const models = collectModels(providers);
    const createdAt = new Date().toISOString();

    return Response.json({
      data: models.map((id) => ({
        type: "model",
        id,
        display_name: id,
        created_at: createdAt,
      })),
      has_more: false,
      first_id: models.at(0) ?? null,
      last_id: models.at(-1) ?? null,
    });
  },
  createErrorResponse: (error) => {
    const { code, message, status } = error;
    return Response.json(
      {
        type: "error",
        error: {
          type: errorTypeByCode[code],
          message,
        },
      },
      { status },
    );
  },
  createSseResponseCollector,
  extractResponseMetadata: (payload) => responseUsageSchema.safeParse(payload).data ?? {},
};

export const anthropicAdapter: ProtocolAdapter = {
  defaultEndpoint,
  defaultBaseUrl,
  protocolType,
  requestAdapter,
  responseAdapter,
};
