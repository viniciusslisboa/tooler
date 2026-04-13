/**
 * Base error class for all Tooler errors.
 */
export class ToolerError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ToolerError";
    this.code = code;
  }
}

/**
 * Thrown when a requested tool is not found in the registry.
 */
export class ToolNotFoundError extends ToolerError {
  constructor(name: string) {
    super("TOOL_NOT_FOUND", `Tool "${name}" is not registered`);
    this.name = "ToolNotFoundError";
  }
}

/**
 * Thrown when tool input fails schema validation.
 */
export class ToolValidationError extends ToolerError {
  public readonly issues: unknown[];

  constructor(issues: unknown[]) {
    super(
      "VALIDATION_ERROR",
      `Input validation failed: ${JSON.stringify(issues)}`,
    );
    this.name = "ToolValidationError";
    this.issues = issues;
  }
}

/**
 * Thrown when a tool with the same name is registered twice.
 */
export class ToolAlreadyRegisteredError extends ToolerError {
  constructor(name: string) {
    super(
      "TOOL_ALREADY_REGISTERED",
      `Tool "${name}" is already registered`,
    );
    this.name = "ToolAlreadyRegisteredError";
  }
}

/**
 * Thrown when a tool handler fails at runtime.
 */
export class ToolExecutionError extends ToolerError {
  public readonly cause: unknown;

  constructor(toolName: string, cause: unknown) {
    const msg =
      cause instanceof Error ? cause.message : String(cause);
    super("EXECUTION_ERROR", `Tool "${toolName}" failed: ${msg}`);
    this.name = "ToolExecutionError";
    this.cause = cause;
  }
}
