import { describe, it, expect } from "vitest";
import {
  ToolerError,
  ToolNotFoundError,
  ToolValidationError,
  ToolAlreadyRegisteredError,
  ToolExecutionError,
} from "../src/errors.js";

describe("Error classes", () => {
  it("ToolerError has code and message", () => {
    const err = new ToolerError("MY_CODE", "something broke");
    expect(err.code).toBe("MY_CODE");
    expect(err.message).toBe("something broke");
    expect(err).toBeInstanceOf(Error);
  });

  it("ToolNotFoundError", () => {
    const err = new ToolNotFoundError("missing_tool");
    expect(err.code).toBe("TOOL_NOT_FOUND");
    expect(err.message).toContain("missing_tool");
  });

  it("ToolValidationError carries issues", () => {
    const issues = [{ path: ["field"], message: "Required" }];
    const err = new ToolValidationError(issues);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.issues).toEqual(issues);
  });

  it("ToolAlreadyRegisteredError", () => {
    const err = new ToolAlreadyRegisteredError("dup");
    expect(err.code).toBe("TOOL_ALREADY_REGISTERED");
    expect(err.message).toContain("dup");
  });

  it("ToolExecutionError wraps cause", () => {
    const cause = new Error("boom");
    const err = new ToolExecutionError("my_tool", cause);
    expect(err.code).toBe("EXECUTION_ERROR");
    expect(err.message).toContain("boom");
    expect(err.cause).toBe(cause);
  });
});
