# tooler

A TypeScript library for defining, managing, and executing AI tool calls (function calls) received via HTTP. Provides standardized tool creation, lifecycle management, input validation, context propagation, and a framework-agnostic HTTP handler.

## Features

- **`defineTool()`** — type-safe tool definitions with Zod schema validation
- **`ToolContext`** — propagate and collect metadata throughout execution
- **`ToolRegistry`** — register, discover, and export tools (OpenAI-compatible)
- **`Tooler`** — facade with lifecycle hooks (`beforeExecute`, `afterExecute`, `onError`)
- **`createHandler()`** — framework-agnostic HTTP handler (Express, Fastify, plain Node)
- **Batch execution** — run multiple tool calls in parallel
- **Structured results** — every response includes timing, context, and error details

## Install

```bash
pnpm add tooler
```

## Quick Start

### 1. Define tools

```ts
import { z } from "zod";
import { defineTool } from "tooler";

const getWeather = defineTool({
  name: "get_weather",
  description: "Returns current weather for a city",
  parameters: z.object({
    city: z.string(),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
  }),
  handler: async ({ city, unit }, ctx) => {
    ctx.set("source", "weather-api");
    return { city, temperature: 22, unit, condition: "sunny" };
  },
});
```

### 2. Create a Tooler instance with lifecycle hooks

```ts
import { Tooler } from "tooler";

const tooler = new Tooler({
  hooks: {
    beforeExecute: (req, ctx) => {
      console.log(`Executing ${req.name}`);
    },
    afterExecute: (result) => {
      console.log(`${result.name} took ${result.timing.durationMs}ms`);
    },
    onError: (err, req) => {
      console.error(`${req.name} failed:`, err);
    },
  },
});

tooler.register(getWeather);
```

### 3. Expose via HTTP

```ts
import express from "express";
import { createHandler } from "tooler";

const app = express();
app.use(express.json());
app.post("/tools", createHandler(tooler));
app.listen(3000);
```

### 4. Call it

```bash
curl -X POST http://localhost:3000/tools \
  -H 'Content-Type: application/json' \
  -d '{"id":"call-1","name":"get_weather","arguments":{"city":"São Paulo"}}'
```

### Response

```json
{
  "callId": "call-1",
  "name": "get_weather",
  "content": {
    "city": "São Paulo",
    "temperature": 22,
    "unit": "celsius",
    "condition": "sunny"
  },
  "context": {
    "requestId": "call-1",
    "source": "weather-api"
  },
  "timing": {
    "startedAt": "2025-01-01T00:00:00.000Z",
    "completedAt": "2025-01-01T00:00:00.005Z",
    "durationMs": 5
  },
  "success": true
}
```

## API

### `defineTool(options)`

Creates a type-safe tool definition.

| Option | Type | Description |
|---|---|---|
| `name` | `string` | Unique tool name |
| `description` | `string` | Human-readable description |
| `parameters` | `ZodSchema` | Zod schema for input validation |
| `handler` | `(input, ctx) => T` | Implementation function |

### `Tooler`

Main facade for tool execution.

```ts
const tooler = new Tooler({ hooks });
tooler.register(tool1, tool2);

const result = await tooler.execute(request, initialContext);
const results = await tooler.executeBatch(requests, initialContext);
```

### `ToolContext`

Mutable key-value store propagated throughout execution.

```ts
ctx.set("key", value);
ctx.get<string>("key");
ctx.has("key");
ctx.delete("key");
ctx.toJSON(); // snapshot
```

### `createHandler(tooler, options?)`

Returns a `(req, res) => Promise<void>` handler.

- Single call → returns single result (200 on success, 422 on failure)
- Array of calls → returns array of results (200)
- Invalid body → 400

### `ToolRegistry`

```ts
tooler.registry.names();           // string[]
tooler.registry.has("tool_name");  // boolean
tooler.registry.toOpenAIFunctions(); // OpenAI-compatible schema array
```

## Development

```bash
pnpm install      # install deps
pnpm dev          # watch mode
pnpm build        # production build
pnpm test         # run tests
pnpm lint         # lint
pnpm typecheck    # type check
pnpm check        # lint + typecheck + test
```

## License

MIT
