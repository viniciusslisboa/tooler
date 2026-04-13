import type {
  GenericRequest,
  GenericResponse,
  ToolCallRequest,
  ToolContextData,
} from "./types.js";
import type { Tooler } from "./tooler.js";

/**
 * Creates a framework-agnostic HTTP handler for tool call requests.
 *
 * Works with Express, Fastify (with the right adapter), or plain Node
 * `http.createServer` — anything that provides `req.body` and
 * `res.status().json()`.
 *
 * @example
 * ```ts
 * import express from "express";
 * const app = express();
 * app.use(express.json());
 * app.post("/tools", createHandler(tooler));
 * ```
 */
export function createHandler(
  tooler: Tooler,
  options: {
    /** Extract initial context from the incoming request */
    contextFrom?: (req: GenericRequest) => ToolContextData;
  } = {},
) {
  return async (req: GenericRequest, res: GenericResponse): Promise<void> => {
    const initialContext = options.contextFrom?.(req) ?? {};

    const body = req.body;

    if (!body || (typeof body !== "object")) {
      res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Request body must be a tool call object or array",
        },
      });
      return;
    }

    const isBatch = Array.isArray(body);
    const requests: ToolCallRequest[] = isBatch ? body : [body];

    for (const r of requests) {
      if (!r.id || !r.name || typeof r.arguments !== "object") {
        res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message:
              'Each tool call must have "id" (string), "name" (string), and "arguments" (object)',
          },
        });
        return;
      }
    }

    if (isBatch) {
      const results = await tooler.executeBatch(requests, initialContext);
      res.status(200).json(results);
    } else {
      const result = await tooler.execute(requests[0], initialContext);
      const statusCode = result.success ? 200 : 422;
      res.status(statusCode).json(result);
    }
  };
}
