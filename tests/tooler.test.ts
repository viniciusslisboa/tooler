import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { Tooler } from "../src/tooler.js";
import { defineTool } from "../src/define-tool.js";
import type { ToolCallRequest } from "../src/types.js";

const echoTool = defineTool({
  name: "echo",
  description: "Echoes the input",
  parameters: z.object({ message: z.string() }),
  handler: ({ message }, ctx) => {
    ctx.set("echoed", true);
    return { echo: message };
  },
});

const failTool = defineTool({
  name: "fail",
  description: "Always fails",
  parameters: z.object({}),
  handler: () => {
    throw new Error("intentional failure");
  },
});

function makeRequest(
  name: string,
  args: Record<string, unknown> = {},
): ToolCallRequest {
  return { id: `call-${Date.now()}`, name, arguments: args };
}

describe("Tooler", () => {
  it("executes a tool and returns structured result", async () => {
    const tooler = new Tooler();
    tooler.register(echoTool);

    const result = await tooler.execute(
      makeRequest("echo", { message: "hello" }),
    );

    expect(result.success).toBe(true);
    expect(result.content).toEqual({ echo: "hello" });
    expect(result.context.echoed).toBe(true);
    expect(result.context.requestId).toBeDefined();
    expect(result.timing.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.timing.startedAt).toBeDefined();
    expect(result.timing.completedAt).toBeDefined();
  });

  it("returns error for unknown tool", async () => {
    const tooler = new Tooler();
    const result = await tooler.execute(makeRequest("ghost"));

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TOOL_NOT_FOUND");
  });

  it("returns validation error for bad input", async () => {
    const tooler = new Tooler();
    tooler.register(echoTool);

    const result = await tooler.execute(
      makeRequest("echo", { message: 123 as unknown as string }),
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("VALIDATION_ERROR");
  });

  it("returns execution error when handler throws", async () => {
    const tooler = new Tooler();
    tooler.register(failTool);

    const result = await tooler.execute(makeRequest("fail"));

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("EXECUTION_ERROR");
    expect(result.error?.message).toContain("intentional failure");
  });

  it("propagates initial context", async () => {
    const tooler = new Tooler();
    tooler.register(echoTool);

    const result = await tooler.execute(
      makeRequest("echo", { message: "hi" }),
      { tenant: "acme" },
    );

    expect(result.context.tenant).toBe("acme");
  });

  describe("lifecycle hooks", () => {
    it("calls beforeExecute", async () => {
      const before = vi.fn();
      const tooler = new Tooler({ hooks: { beforeExecute: before } });
      tooler.register(echoTool);

      await tooler.execute(makeRequest("echo", { message: "x" }));

      expect(before).toHaveBeenCalledOnce();
    });

    it("calls afterExecute on success", async () => {
      const after = vi.fn();
      const tooler = new Tooler({ hooks: { afterExecute: after } });
      tooler.register(echoTool);

      await tooler.execute(makeRequest("echo", { message: "x" }));

      expect(after).toHaveBeenCalledOnce();
    });

    it("calls onError on failure", async () => {
      const onError = vi.fn();
      const tooler = new Tooler({ hooks: { onError } });
      tooler.register(failTool);

      await tooler.execute(makeRequest("fail"));

      expect(onError).toHaveBeenCalledOnce();
    });

    it("beforeExecute can abort by throwing", async () => {
      const tooler = new Tooler({
        hooks: {
          beforeExecute: () => {
            throw new Error("blocked");
          },
        },
      });
      tooler.register(echoTool);

      const result = await tooler.execute(
        makeRequest("echo", { message: "x" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("blocked");
    });
  });

  describe("executeBatch", () => {
    it("executes multiple calls in parallel", async () => {
      const tooler = new Tooler();
      tooler.register(echoTool, failTool);

      const results = await tooler.executeBatch([
        makeRequest("echo", { message: "a" }),
        makeRequest("echo", { message: "b" }),
        makeRequest("fail"),
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(false);
    });
  });
});
