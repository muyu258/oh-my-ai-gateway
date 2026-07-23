import { getConfiguredGatewayToken } from "#/auth/auth";
import "@scalar/api-reference-react/style.css";

import { ApiReferenceReact } from "@scalar/api-reference-react";

const gatewayToken = getConfiguredGatewayToken();

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
  authentication: {
    preferredSecurityScheme: "openAiGatewayToken",
    securitySchemes: {
      openAiGatewayToken: { value: `Bearer ${gatewayToken}` },
      anthropicGatewayToken: { value: gatewayToken },
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
