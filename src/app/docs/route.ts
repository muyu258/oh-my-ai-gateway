import { getConfiguredGatewayToken } from "#/gateway/auth/gateway-auth";
import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
  pageTitle: "oh-my-ai-gateway API Reference",
  spec: {
    url: "/openapi.json",
  },
  authentication: {
    preferredSecurityScheme: "openAiGatewayToken",
    securitySchemes: {
      openAiGatewayToken: { value: `Bearer ${getConfiguredGatewayToken()}` },
      anthropicGatewayToken: { value: getConfiguredGatewayToken() },
    },
  },
  theme: "default",
});
