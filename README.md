# oh-my-ai-gateway

`oh-my-ai-gateway` is an AI API gateway project for routing native provider-protocol requests
through one controlled entry point while collecting operational statistics, normalizing usage, and
applying versioned billing rates and multipliers.

The initial architecture intentionally does **not** convert between protocols. Clients use native
endpoints such as OpenAI Chat Completions, OpenAI Responses, or Anthropic Messages, and the gateway
routes each request only to an upstream binding that supports the same protocol.

## Current Status

The repository currently contains the Next.js application foundation and the project architecture.
Runtime gateway endpoints, provider integrations, persistence, authentication, metering, and billing
have not yet been implemented.

Implementation will proceed through independently complete phases. See the project documentation for
the source-of-truth design and delivery sequence:

- [Gateway architecture](docs/architecture.md)
- [Phased implementation plan](docs/plan.md)

## Architecture Summary

The planned gateway separates three concerns:

1. **Native protocol handling** identifies and safely forwards a supported wire protocol without
   reshaping its payload.
2. **Provider routing** selects a configured provider protocol binding from the authenticated
   consumer, inbound protocol, and requested model.
3. **Metering and billing** observes provider-reported usage, normalizes it, and creates immutable
   charges from versioned component rates and multipliers.

One provider may expose multiple protocol bindings. Streaming responses remain native and are
observed without buffering the complete stream. Analytics is rebuildable reporting data, while
charge records form a separate immutable ledger.

The MVP may run inside Next.js, but the latency-sensitive gateway core is designed to remain
framework-independent.

## Technology

- Next.js App Router
- React
- TypeScript with strict type checking
- Tailwind CSS
- Bun
- Oxlint and Oxfmt

## Getting Started

Install dependencies and start the development server:

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The current application entry point is `src/app/page.tsx`. The root layout and global styles are in
`src/app/layout.tsx` and `src/app/globals.css`.

## Project Commands

```bash
bun run dev          # Start the development server
bun run build        # Create a production build
bun run start        # Start the production server
bun run lint         # Run Oxlint with TypeScript type-aware rules
bun run format       # Format supported project files with Oxfmt
bun run format:check # Check formatting without changing files
bun run typecheck    # Run the TypeScript compiler without emitting files
bun run check        # Run lint, format:check, and typecheck
```

Oxlint is configured in `.oxlintrc.json` with the native `nextjs`, `react`, and `typescript` plugins.
Oxfmt is configured in `.oxfmtrc.json` and ignores generated Next.js and build output.

## Reference Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Oxlint Documentation](https://oxc.rs/docs/guide/usage/linter)
- [Oxfmt Documentation](https://oxc.rs/docs/guide/usage/formatter)
