import type {
  ToolCallRequest,
  ToolCallResult,
  ToolDefinition,
  ToolerOptions,
  ToolLifecycleHooks,
  ToolContextData,
} from "./types.js";
import { ToolContext } from "./context.js";
import { ToolRegistry } from "./registry.js";
import {
  ToolerError,
  ToolValidationError,
} from "./errors.js";

/**
 * Main facade: wires together registry, context and lifecycle hooks
 * to execute tool calls end-to-end.
 */
export class Tooler {
  public readonly registry: ToolRegistry;
  private hooks: ToolLifecycleHooks;

  constructor(options: ToolerOptions = {}) {
    this.registry = new ToolRegistry();
    this.hooks = options.hooks ?? {};
  }

  /** Register one or more tool definitions. */
  register(...tools: ToolDefinition[]): this {
    this.registry.register(...tools);
    return this;
  }

  /**
   * Execute a single tool call request.
   *
   * 1. Resolve tool from registry
   * 2. Validate input via Zod schema
   * 3. Run lifecycle hooks (before → handler → after / onError)
   * 4. Return structured result with timing + context
   */
  async execute(
    request: ToolCallRequest,
    initialContext: ToolContextData = {},
  ): Promise<ToolCallResult> {
    const ctx = new ToolContext({
      requestId: request.id,
      ...initialContext,
    });

    const startedAt = new Date();

    try {
      const tool = this.registry.get(request.name);

      const schema =
        typeof tool.parameters === "function"
          ? tool.parameters()
          : tool.parameters;
      const parseResult = schema.safeParse(request.arguments);

      if (!parseResult.success) {
        throw new ToolValidationError(
          "error" in parseResult ? (parseResult.error as { issues: unknown[] }).issues : [],
        );
      }

      const validatedInput = parseResult.data;

      if (this.hooks.beforeExecute) {
        await this.hooks.beforeExecute(request, ctx);
      }

      const content = await tool.handler(validatedInput, ctx);

      const completedAt = new Date();
      const result: ToolCallResult = {
        callId: request.id,
        name: request.name,
        content,
        context: ctx.toJSON(),
        timing: {
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          durationMs: completedAt.getTime() - startedAt.getTime(),
        },
        success: true,
      };

      if (this.hooks.afterExecute) {
        await this.hooks.afterExecute(result, ctx);
      }

      return result;
    } catch (err) {
      if (this.hooks.onError) {
        await this.hooks.onError(err, request, ctx);
      }

      const completedAt = new Date();
      const isToolerError = err instanceof ToolerError;

      return {
        callId: request.id,
        name: request.name,
        content: null,
        context: ctx.toJSON(),
        timing: {
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          durationMs: completedAt.getTime() - startedAt.getTime(),
        },
        success: false,
        error: {
          code: isToolerError ? err.code : "EXECUTION_ERROR",
          message: isToolerError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err),
        },
      };
    }
  }

  /**
   * Execute multiple tool calls in parallel.
   */
  async executeBatch(
    requests: ToolCallRequest[],
    initialContext: ToolContextData = {},
  ): Promise<ToolCallResult[]> {
    return Promise.all(
      requests.map((req) => this.execute(req, initialContext)),
    );
  }
}
