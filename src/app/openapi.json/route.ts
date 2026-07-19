export const GET = (): Response =>
  Response.json({
    openapi: "3.1.0",
    info: {
      title: "oh-my-ai-gateway",
      version: "0.1.0",
      description: "Native-protocol AI gateway endpoints.",
    },
    servers: [{ url: "/" }],
    paths: {
      "/v1/chat/completions": {
        post: {
          security: [{ openAiGatewayToken: [] }],
          "x-codeSamples": [
            {
              lang: "cURL",
              label: "cURL",
              source: `curl http://localhost:3000/v1/chat/completions \\
  --request POST \\
  --header 'Content-Type: application/json' \\
  --header 'Authorization: Bearer token' \\
  --data '{
  "model": "gpt-5.4-mini",
  "messages": [
    {
      "role": "user",
      "content": "Reply with exactly OK"
    }
  ],
  "stream": true
}'`,
            },
          ],
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
          "x-codeSamples": [
            {
              lang: "cURL",
              label: "cURL",
              source: `curl http://localhost:3000/v1/responses \\
  --request POST \\
  --header 'Content-Type: application/json' \\
  --header 'Authorization: Bearer token' \\
  --data '{
  "model": "gpt-5.4-mini",
  "input": "Reply with exactly OK",
  "stream": true
}'`,
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                example: { model: "gpt-5.4-mini", input: "Reply with exactly OK", stream: true },
              },
            },
          },
        },
      },
      "/v1/messages": {
        post: {
          security: [{ anthropicGatewayToken: [] }],
          "x-codeSamples": [
            {
              lang: "cURL",
              label: "cURL",
              source: `curl http://localhost:3000/v1/messages \\
  --request POST \\
  --header 'Content-Type: application/json' \\
  --header 'x-api-key: token' \\
  --header 'anthropic-version: 2023-06-01' \\
  --data '{
  "model": "gpt-5.4-mini",
  "max_tokens": 64,
  "messages": [
    {
      "role": "user",
      "content": "Reply with exactly OK"
    }
  ],
  "stream": true
}'`,
            },
          ],
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
  });
