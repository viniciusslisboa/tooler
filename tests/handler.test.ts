import { describe, it, expect } from "vitest";
import { z } from "zod";
import { Tooler } from "../src/tooler.js";
import { defineTool } from "../src/define-tool.js";
import { createHandler } from "../src/handler.js";
import type { GenericRequest, GenericResponse } from "../src/types.js";

const sumTool = defineTool({
  name: "sum",
  description: "Sums two numbers",
  parameters: z.object({ a: z.number(), b: z.number() }),
  handler: ({ a, b }) => a + b,
});

function mockRes(): GenericResponse & { _status: number; _body: unknown } {
  const res = {
    _status: 0,
    _body: null as unknown,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: unknown) {
      res._body = data;
    },
  };
  return res;
}

describe("createHandler", () => {
  it("handles a single tool call", async () => {
    const tooler = new Tooler();
    tooler.register(sumTool);
    const handler = createHandler(tooler);

    const req: GenericRequest = {
      body: { id: "1", name: "sum", arguments: { a: 2, b: 3 } },
    };
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    const body = res._body as { success: boolean; content: number };
    expect(body.success).toBe(true);
    expect(body.content).toBe(5);
  });

  it("handles a batch of tool calls", async () => {
    const tooler = new Tooler();
    tooler.register(sumTool);
    const handler = createHandler(tooler);

    const req: GenericRequest = {
      body: [
        { id: "1", name: "sum", arguments: { a: 1, b: 1 } },
        { id: "2", name: "sum", arguments: { a: 10, b: 20 } },
      ],
    };
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    const body = res._body as Array<{ content: number }>;
    expect(body).toHaveLength(2);
    expect(body[0].content).toBe(2);
    expect(body[1].content).toBe(30);
  });

  it("returns 400 for invalid body", async () => {
    const tooler = new Tooler();
    const handler = createHandler(tooler);

    const res = mockRes();
    await handler({ body: null as unknown as never } as GenericRequest, res);

    expect(res._status).toBe(400);
  });

  it("returns 400 for malformed tool call", async () => {
    const tooler = new Tooler();
    const handler = createHandler(tooler);

    const req: GenericRequest = {
      body: { id: "1", name: "sum", arguments: "not-an-object" } as never,
    };
    const res = mockRes();

    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 422 when tool execution fails", async () => {
    const tooler = new Tooler();
    tooler.register(sumTool);
    const handler = createHandler(tooler);

    const req: GenericRequest = {
      body: { id: "1", name: "sum", arguments: { a: "not-a-number", b: 3 } },
    };
    const res = mockRes();

    await handler(req, res);
    expect(res._status).toBe(422);
  });

  it("extracts initial context from request", async () => {
    const tooler = new Tooler();
    tooler.register(sumTool);
    const handler = createHandler(tooler, {
      contextFrom: (req) => ({
        userAgent: req.headers?.["user-agent"],
      }),
    });

    const req: GenericRequest = {
      body: { id: "1", name: "sum", arguments: { a: 1, b: 2 } },
      headers: { "user-agent": "test-client" },
    };
    const res = mockRes();

    await handler(req, res);

    const body = res._body as { context: { userAgent: string } };
    expect(body.context.userAgent).toBe("test-client");
  });
});
