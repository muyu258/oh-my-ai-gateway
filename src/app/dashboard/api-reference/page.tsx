import "@scalar/api-reference-react/style.css";

import { ApiReferenceReact } from "@scalar/api-reference-react";

const providerIdParameter = {
  name: "x-provider-id",
  in: "header",
  required: false,
  description: "Route to the matching provider UUID. Omit to use the first eligible provider.",
  schema: { type: "string", format: "uuid" },
};

const configuration = {
  content: {
    info: {
      title: "Oh My AI Gateway",
    },
    servers: [{ url: "/" }],
    paths: {
      "/v1/chat/completions": {
        post: {
          security: [{ openAiGatewayToken: [] }],
          parameters: [providerIdParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                example: {
                  model: "gpt-5.4-mini",
                  messages: [{ role: "user", content: "Reply with exactly OK" }],
                  stream: true,
                },
              },
            },
          },
        },
      },
      "/v1/responses": {
        post: {
          security: [{ openAiGatewayToken: [] }],
          parameters: [providerIdParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                example: {
                  model: "gpt-5.4-mini",
                  input: "Reply with exactly OK",
                  stream: true,
                },
              },
            },
          },
        },
      },
      "/v1/messages": {
        post: {
          security: [{ anthropicGatewayToken: [] }],
          parameters: [providerIdParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                example: {
                  model: "gpt-5.4-mini",
                  max_tokens: 64,
                  messages: [{ role: "user", content: "Reply with exactly OK" }],
                  stream: true,
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        openAiGatewayToken: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "Enter the gateway token as: Bearer <token>.",
        },
        anthropicGatewayToken: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Enter the gateway token in the x-api-key header.",
        },
      },
    },
  },
  theme: "default" as const,
};

export default function ApiReferencePage() {
  return (
    <div className="embedded-api-reference h-full w-full overflow-auto bg-white">
      <ApiReferenceReact configuration={configuration} />
    </div>
  );
}
