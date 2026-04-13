/**
 * Demo: standalone HTTP server using Node's built-in `http` module.
 *
 * Run:  npx tsx examples/demo-server.ts
 * Test: curl -X POST http://localhost:3033/tools \
 *         -H 'Content-Type: application/json' \
 *         -d '{"id":"call-1","name":"get_weather","arguments":{"city":"São Paulo"}}'
 */
import http from "node:http";
import { z } from "zod";
import { Tooler, defineTool, createHandler } from "../src/index.js";

const getWeather = defineTool({
  name: "get_weather",
  description: "Returns current weather for a city",
  parameters: z.object({
    city: z.string().describe("City name"),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
  }),
  handler: async ({ city, unit }, ctx) => {
    ctx.set("source", "mock-weather-api");
    ctx.set("cached", false);
    const temp = unit === "celsius" ? 24 : 75;
    return { city, temperature: temp, unit, condition: "sunny" };
  },
});

const searchDatabase = defineTool({
  name: "search_database",
  description: "Searches records in the database",
  parameters: z.object({
    query: z.string(),
    limit: z.number().int().min(1).max(100).default(10),
  }),
  handler: async ({ query, limit }, ctx) => {
    ctx.set("source", "mock-db");
    return {
      query,
      results: Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${query}"`,
      })),
      total: 42,
    };
  },
});

const tooler = new Tooler({
  hooks: {
    beforeExecute: (req, ctx) => {
      console.log(`[before] Executing ${req.name} (id: ${req.id})`);
      ctx.set("startedBy", "demo-server");
    },
    afterExecute: (result) => {
      console.log(
        `[after] ${result.name} completed in ${result.timing.durationMs}ms`,
      );
    },
    onError: (err, req) => {
      console.error(`[error] ${req.name} failed:`, err);
    },
  },
});

tooler.register(getWeather, searchDatabase);

const handler = createHandler(tooler, {
  contextFrom: (req) => ({
    userAgent: req.headers?.["user-agent"],
  }),
});

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/tools") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(tooler.registry.toOpenAIFunctions(), null, 2));
    return;
  }

  if (req.method === "POST" && req.url === "/tools") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = JSON.parse(Buffer.concat(chunks).toString());

    const generic = {
      body,
      headers: req.headers as Record<string, string | string[] | undefined>,
    };

    let statusCode = 200;
    const fakeRes = {
      status(code: number) {
        statusCode = code;
        return fakeRes;
      },
      json(data: unknown) {
        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data, null, 2));
      },
    };

    await handler(generic, fakeRes);
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const PORT = 3033;
server.listen(PORT, () => {
  console.log(`Tooler demo server running on http://localhost:${PORT}`);
  console.log(`Registered tools: ${tooler.registry.names().join(", ")}`);
  console.log(`\nTry:`);
  console.log(
    `  curl -s http://localhost:${PORT}/tools | jq   # list tools`,
  );
  console.log(
    `  curl -s -X POST http://localhost:${PORT}/tools -H 'Content-Type: application/json' -d '{"id":"call-1","name":"get_weather","arguments":{"city":"São Paulo"}}' | jq`,
  );
});
