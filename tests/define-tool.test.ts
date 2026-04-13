import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineTool } from "../src/define-tool.js";

describe("defineTool", () => {
  it("creates a tool definition with correct shape", () => {
    const tool = defineTool({
      name: "greet",
      description: "Greets someone",
      parameters: z.object({ name: z.string() }),
      handler: ({ name }) => `Hello, ${name}!`,
    });

    expect(tool.name).toBe("greet");
    expect(tool.description).toBe("Greets someone");
    expect(tool.parameters).toBeDefined();
    expect(typeof tool.handler).toBe("function");
  });

  it("handler receives typed input", async () => {
    const tool = defineTool({
      name: "add",
      description: "Adds two numbers",
      parameters: z.object({ a: z.number(), b: z.number() }),
      handler: ({ a, b }) => a + b,
    });

    const { ToolContext } = await import("../src/context.js");
    const ctx = new ToolContext();
    const result = await tool.handler({ a: 3, b: 7 }, ctx);
    expect(result).toBe(10);
  });

  it("supports lazy schema via factory function", () => {
    const tool = defineTool({
      name: "lazy",
      description: "Lazy schema",
      parameters: () => z.object({ x: z.number() }),
      handler: ({ x }) => x * 2,
    });

    const schema =
      typeof tool.parameters === "function"
        ? tool.parameters()
        : tool.parameters;
    const result = schema.safeParse({ x: 5 });
    expect(result.success).toBe(true);
  });
});
