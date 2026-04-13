import type { ToolContextData } from "./types.js";

/**
 * ToolContext carries metadata throughout a tool's lifecycle.
 *
 * Handlers receive a context and can read/write arbitrary data.
 * The final state of the context is included in the response,
 * giving the caller rich observability into what happened.
 */
export class ToolContext {
  private data: ToolContextData;

  constructor(initial: ToolContextData = {}) {
    this.data = { ...initial };
  }

  /** Retrieve a value by key. */
  get<T = unknown>(key: string): T | undefined {
    return this.data[key] as T | undefined;
  }

  /** Set a value. Returns `this` for chaining. */
  set(key: string, value: unknown): this {
    this.data[key] = value;
    return this;
  }

  /** Check whether a key exists. */
  has(key: string): boolean {
    return key in this.data;
  }

  /** Delete a key. */
  delete(key: string): boolean {
    if (key in this.data) {
      delete this.data[key];
      return true;
    }
    return false;
  }

  /** Return a plain snapshot of all context data. */
  toJSON(): ToolContextData {
    return { ...this.data };
  }
}
