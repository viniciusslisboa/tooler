# AGENTS.md

## Cursor Cloud specific instructions

This is a TypeScript library (`tooler`) for AI tool call management. Uses pnpm as package manager.

**Key commands** (all documented in `package.json` scripts):
- `pnpm install` — install dependencies
- `pnpm check` — runs lint + typecheck + test in sequence
- `pnpm dev` — watch mode (tsup)
- `pnpm build` — production build (tsup, generates ESM + CJS + DTS)

**Caveats:**
- TypeScript 6 is used. The `tsup.config.ts` passes `ignoreDeprecations: "6.0"` for DTS generation because tsup internally uses `baseUrl` which is deprecated in TS 6.
- Zod v4 is used (not v3). Use `z.object()` etc. from `zod` directly. JSON schema export uses `.toJsonSchema()` method.
- The demo server (`examples/demo-server.ts`) runs with `npx tsx examples/demo-server.ts` on port 3033.
