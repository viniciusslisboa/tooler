import type { z } from "zod";
import type { ToolContext } from "./context.js";

/**
 * Represents the inbound HTTP request payload for a tool call,
 * matching the standard OpenAI/Anthropic function-call shape.
 */
export interface ToolCallRequest {
  /** Unique ID assigned by the caller (e.g. the LLM runtime) */
  id: string;
  /** Tool name the model selected */
  name: string;
  /** Raw JSON arguments sent by the model */
  arguments: Record<string, unknown>;
}

/**
 * Metadata that travels alongside every tool execution.
 * Users can extend this with arbitrary key-value pairs.
 */
export interface ToolContextData {
  /** Correlation / trace ID propagated from the caller */
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Structured result returned after a tool executes.
 */
export interface ToolCallResult<T = unknown> {
  /** Echo back the original call ID */
  callId: string;
  /** Tool name that was executed */
  name: string;
  /** The tool's return value */
  content: T;
  /** Additional context collected during execution */
  context: ToolContextData;
  /** ISO-8601 timestamps for observability */
  timing: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
  /** Whether the tool execution succeeded */
  success: boolean;
  /** Error details when success is false */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * A Zod schema or a function that returns a Zod schema.
 * Allows lazy evaluation for circular references.
 */
export type SchemaOrFactory<S extends z.ZodType = z.ZodType> = S | (() => S);

/**
 * The handler function every tool must implement.
 */
export type ToolHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  ctx: ToolContext,
) => TOutput | Promise<TOutput>;

/**
 * Full definition of a tool as produced by `defineTool`.
 */
export interface ToolDefinition<
  TInput = unknown,
  TOutput = unknown,
> {
  name: string;
  description: string;
  parameters: SchemaOrFactory;
  handler: ToolHandler<TInput, TOutput>;
}

/** Re-export for convenience in handler signatures */
export type { ToolContext };

/**
 * Lifecycle hooks that fire around tool execution.
 */
export interface ToolLifecycleHooks {
  /** Fires before the handler. Throw to abort. */
  beforeExecute?: (
    request: ToolCallRequest,
    ctx: ToolContext,
  ) => void | Promise<void>;

  /** Fires after a successful handler return. */
  afterExecute?: (
    result: ToolCallResult,
    ctx: ToolContext,
  ) => void | Promise<void>;

  /** Fires when the handler (or beforeExecute) throws. */
  onError?: (
    error: unknown,
    request: ToolCallRequest,
    ctx: ToolContext,
  ) => void | Promise<void>;
}

/**
 * Configuration for the Tooler facade.
 */
export interface ToolerOptions {
  hooks?: ToolLifecycleHooks;
}

/**
 * Shape of the HTTP request the handler expects.
 * Framework-agnostic: works with Express, Fastify, plain Node, etc.
 */
export interface GenericRequest {
  body: ToolCallRequest | ToolCallRequest[];
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Shape of the HTTP response the handler writes to.
 */
export interface GenericResponse {
  status(code: number): GenericResponse;
  json(data: unknown): void;
}
