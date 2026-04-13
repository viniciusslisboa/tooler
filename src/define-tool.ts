import type { z } from "zod";
import type { ToolDefinition, ToolHandler, SchemaOrFactory } from "./types.js";
import type { ToolContext } from "./context.js";

/**
 * Options accepted by `defineTool`.
 */
interface DefineToolOptions<
  S extends z.ZodType,
  TOutput,
> {
  name: string;
  description: string;
  parameters: SchemaOrFactory<S>;
  handler: (input: z.output<S>, ctx: ToolContext) => TOutput | Promise<TOutput>;
}

/**
 * Creates a type-safe tool definition.
 *
 * @example
 * ```ts
 * const weatherTool = defineTool({
 *   name: "get_weather",
 *   description: "Returns current weather for a city",
 *   parameters: z.object({ city: z.string() }),
 *   handler: async ({ city }, ctx) => {
 *     ctx.set("source", "weather-api");
 *     return { temperature: 22, unit: "celsius", city };
 *   },
 * });
 * ```
 */
export function defineTool<S extends z.ZodType, TOutput>(
  options: DefineToolOptions<S, TOutput>,
): ToolDefinition<z.output<S>, TOutput> {
  return {
    name: options.name,
    description: options.description,
    parameters: options.parameters,
    handler: options.handler as ToolHandler<z.output<S>, TOutput>,
  };
}
