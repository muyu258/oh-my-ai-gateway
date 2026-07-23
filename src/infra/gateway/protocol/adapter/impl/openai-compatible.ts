import { invariant } from "es-toolkit";
import { ProtocolType } from "../../protocol.types";
import { appendEndpoint, withProviderHeaders } from "../adapter.helpers";
import type {
  ProtocolAdapter,
  RequestAdapter,
  ResponseAdapter,
  SseResponseCollector,
} from "../adapter.types";
import { z } from "zod";
import { createErrorResponse, createModelsResponse } from "./shared/openai.helpers";

const defaultEndpoint = "/v1/chat/completions";
const defaultBaseUrl = "https://api.openai.com";
const protocolType = ProtocolType.OpenaiCompatible;

const requestSchema = z.object({ model: z.string().min(1) });
const responseUsageSchema = z
  .object({
    usage: z
      .object({
        prompt_tokens: z.number().optional(),
        completion_tokens: z.number().optional(),
        prompt_tokens_details: z.object({ cached_tokens: z.number().optional() }).optional(),
      })
      .optional(),
  })
  .transform(({ usage }) =>
    usage
      ? {
          usage: {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            cachedInputTokens: usage.prompt_tokens_details?.cached_tokens,
          },
        }
      : {},
  );

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : undefined;

const appendString = (target: JsonRecord, key: string, value: unknown): void => {
  if (typeof value !== "string") return;
  target[key] = `${typeof target[key] === "string" ? target[key] : ""}${value}`;
};

type ChatChoiceState = {
  index: number;
  message: JsonRecord;
  toolCalls: Map<number, JsonRecord>;
  finishReason: unknown;
  logprobs: JsonRecord | null;
};

const createSseResponseCollector = (): SseResponseCollector => {
  const response: JsonRecord = {};
  const choices = new Map<number, ChatChoiceState>();
  let usage: JsonRecord | undefined;

  const getChoice = (index: number): ChatChoiceState => {
    const current = choices.get(index);
    if (current) return current;

    const created: ChatChoiceState = {
      index,
      message: {},
      toolCalls: new Map(),
      finishReason: null,
      logprobs: null,
    };
    choices.set(index, created);
    return created;
  };

  return {
    append: ({ data }) => {
      const chunk = asRecord(data);
      if (!chunk) return;
      if (chunk.error !== undefined || chunk.object === "error") throw chunk;

      for (const [key, value] of Object.entries(chunk)) {
        if (key !== "choices" && key !== "usage") response[key] = value;
      }
      if (response.object === "chat.completion.chunk") response.object = "chat.completion";

      const chunkUsage = asRecord(chunk.usage);
      if (chunkUsage) usage = { ...chunkUsage };

      if (!Array.isArray(chunk.choices)) return;
      for (const value of chunk.choices) {
        const choice = asRecord(value);
        if (!choice || typeof choice.index !== "number") continue;

        const state = getChoice(choice.index);
        if (choice.finish_reason !== undefined) state.finishReason = choice.finish_reason;

        const logprobs = asRecord(choice.logprobs);
        if (logprobs) {
          state.logprobs ??= {};
          for (const [key, logprobValue] of Object.entries(logprobs)) {
            const current = state.logprobs[key];
            state.logprobs[key] =
              Array.isArray(current) && Array.isArray(logprobValue)
                ? [...current, ...logprobValue]
                : logprobValue;
          }
        }

        const delta = asRecord(choice.delta);
        if (!delta) continue;

        if (typeof delta.role === "string") state.message.role = delta.role;
        appendString(state.message, "content", delta.content);
        appendString(state.message, "refusal", delta.refusal);

        const functionCall = asRecord(delta.function_call);
        if (functionCall) {
          const current = asRecord(state.message.function_call) ?? {};
          if (typeof functionCall.name === "string") current.name = functionCall.name;
          appendString(current, "arguments", functionCall.arguments);
          state.message.function_call = current;
        }

        if (Array.isArray(delta.tool_calls)) {
          for (const toolCallValue of delta.tool_calls) {
            const toolCall = asRecord(toolCallValue);
            if (!toolCall) continue;

            const toolIndex = typeof toolCall.index === "number" ? toolCall.index : 0;
            const current = state.toolCalls.get(toolIndex) ?? {};
            if (typeof toolCall.id === "string") current.id = toolCall.id;
            if (typeof toolCall.type === "string") current.type = toolCall.type;

            const functionDelta = asRecord(toolCall.function);
            if (functionDelta) {
              const currentFunction = asRecord(current.function) ?? {};
              if (typeof functionDelta.name === "string") currentFunction.name = functionDelta.name;
              appendString(currentFunction, "arguments", functionDelta.arguments);
              current.function = currentFunction;
            }
            state.toolCalls.set(toolIndex, current);
          }
        }

        for (const [key, deltaValue] of Object.entries(delta)) {
          if (["role", "content", "refusal", "function_call", "tool_calls"].includes(key)) {
            continue;
          }
          if (typeof deltaValue === "string") appendString(state.message, key, deltaValue);
          else if (deltaValue !== null) state.message[key] = deltaValue;
        }
      }
    },
    complete: () => ({
      ...response,
      choices: [...choices.values()]
        .sort((left, right) => left.index - right.index)
        .map((choice) => {
          if (choice.toolCalls.size) {
            choice.message.tool_calls = [...choice.toolCalls.entries()]
              .sort(([left], [right]) => left - right)
              .map(([, toolCall]) => toolCall);
          }

          return {
            index: choice.index,
            message: choice.message,
            logprobs: choice.logprobs,
            finish_reason: choice.finishReason,
          };
        }),
      ...(usage ? { usage } : {}),
    }),
  };
};

const requestAdapter: RequestAdapter = {
  getModel: async (request: Request): Promise<string> => {
    const payload: unknown = await request.clone().json();
    return requestSchema.parse(payload).model;
  },
  getGatewayToken: ({ headers }: Request): string => {
    const authorization = headers.get("authorization");
    invariant(authorization, new Error("Bearer gateway token is required"));
    return authorization.replace(/^Bearer\s+/i, "");
  },
  requestTransformer: ({ request, options }) => {
    const { providerToken, baseUrl = defaultBaseUrl, endpoint = defaultEndpoint } = options;
    const upstreamRequest = new Request(appendEndpoint(baseUrl, endpoint), request);
    return withProviderHeaders(upstreamRequest, {
      authorization: `Bearer ${providerToken}`,
    });
  },
};

const responseAdapter: ResponseAdapter = {
  createModelsResponse,
  createErrorResponse,
  createSseResponseCollector,
  extractResponseMetadata: (payload) => responseUsageSchema.safeParse(payload).data ?? {},
};

export const openaiCompatibleAdapter: ProtocolAdapter = {
  defaultEndpoint,
  defaultBaseUrl,
  protocolType,
  requestAdapter,
  responseAdapter,
};
