# oh-my-ai-gateway

A Next.js App Router project using TypeScript, Tailwind CSS, Oxlint, and Oxfmt.

## Getting Started

This project uses Bun. Install dependencies and start the development server:

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The application entrypoint is `src/app/page.tsx`. The root layout and global styles are in `src/app/layout.tsx` and `src/app/globals.css`.

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

Oxlint is configured in `.oxlintrc.json` with the native `nextjs`, `react`, and `typescript` plugins. Oxfmt is configured in `.oxfmtrc.json` and ignores generated Next.js and build output.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Oxlint Documentation](https://oxc.rs/docs/guide/usage/linter)
- [Oxfmt Documentation](https://oxc.rs/docs/guide/usage/formatter)
