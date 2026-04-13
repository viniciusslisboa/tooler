import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../src/registry.js";
import { defineTool } from "../src/define-tool.js";
import { ToolAlreadyRegisteredError, ToolNotFoundError } from "../src/errors.js";

function makeTestTool(name: string) {
  return defineTool({
    name,
    description: `Test tool ${name}`,
    parameters: z.object({ input: z.string() }),
    handler: ({ input }) => input,
  });
}

describe("ToolRegistry", () => {
  it("registers and retrieves tools", () => {
    const registry = new ToolRegistry();
    const tool = makeTestTool("alpha");
    registry.register(tool);

    expect(registry.has("alpha")).toBe(true);
    expect(registry.get("alpha")).toBe(tool);
    expect(registry.size).toBe(1);
    expect(registry.names()).toEqual(["alpha"]);
  });

  it("registers multiple tools at once", () => {
    const registry = new ToolRegistry();
    registry.register(makeTestTool("a"), makeTestTool("b"), makeTestTool("c"));
    expect(registry.size).toBe(3);
  });

  it("throws on duplicate registration", () => {
    const registry = new ToolRegistry();
    registry.register(makeTestTool("dup"));
    expect(() => registry.register(makeTestTool("dup"))).toThrow(
      ToolAlreadyRegisteredError,
    );
  });

  it("throws on get for unknown tool", () => {
    const registry = new ToolRegistry();
    expect(() => registry.get("nope")).toThrow(ToolNotFoundError);
  });

  it("exports OpenAI-compatible function schemas", () => {
    const registry = new ToolRegistry();
    registry.register(
      defineTool({
        name: "greet",
        description: "Says hello",
        parameters: z.object({ name: z.string() }),
        handler: ({ name }) => `Hello ${name}`,
      }),
    );

    const fns = registry.toOpenAIFunctions();
    expect(fns).toHaveLength(1);
    expect(fns[0].type).toBe("function");
    expect(fns[0].function.name).toBe("greet");
    expect(fns[0].function.description).toBe("Says hello");
    expect(fns[0].function.parameters).toBeDefined();
  });
});
