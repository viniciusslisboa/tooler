import type { ToolDefinition } from "./types.js";
import { ToolAlreadyRegisteredError, ToolNotFoundError } from "./errors.js";

/**
 * Registry that stores and retrieves tool definitions by name.
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  /** Register one or more tools. Throws if a name is already taken. */
  register(...definitions: ToolDefinition[]): this {
    for (const def of definitions) {
      if (this.tools.has(def.name)) {
        throw new ToolAlreadyRegisteredError(def.name);
      }
      this.tools.set(def.name, def);
    }
    return this;
  }

  /** Look up a tool by name. Throws if not found. */
  get(name: string): ToolDefinition {
    const tool = this.tools.get(name);
    if (!tool) throw new ToolNotFoundError(name);
    return tool;
  }

  /** Check whether a tool is registered. */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** Return all registered tool names. */
  names(): string[] {
    return [...this.tools.keys()];
  }

  /** Total number of registered tools. */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Export all tools as an OpenAI-compatible function schema array.
   * Useful for sending the tool list back to the LLM.
   */
  toOpenAIFunctions(): Array<{
    type: "function";
    function: { name: string; description: string; parameters: unknown };
  }> {
    return [...this.tools.values()].map((t) => {
      const schema =
        typeof t.parameters === "function" ? t.parameters() : t.parameters;

      return {
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters:
            "toJsonSchema" in schema
              ? (schema as unknown as { toJsonSchema: () => unknown }).toJsonSchema()
              : {},
        },
      };
    });
  }
}
