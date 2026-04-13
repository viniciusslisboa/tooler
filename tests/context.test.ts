import { describe, it, expect } from "vitest";
import { ToolContext } from "../src/context.js";

describe("ToolContext", () => {
  it("initializes with provided data", () => {
    const ctx = new ToolContext({ requestId: "abc", foo: "bar" });
    expect(ctx.get("requestId")).toBe("abc");
    expect(ctx.get("foo")).toBe("bar");
  });

  it("initializes empty when no data provided", () => {
    const ctx = new ToolContext();
    expect(ctx.toJSON()).toEqual({});
  });

  it("sets and gets values", () => {
    const ctx = new ToolContext();
    ctx.set("key", 42);
    expect(ctx.get("key")).toBe(42);
  });

  it("supports chaining on set", () => {
    const ctx = new ToolContext();
    const result = ctx.set("a", 1).set("b", 2);
    expect(result).toBe(ctx);
    expect(ctx.get("a")).toBe(1);
    expect(ctx.get("b")).toBe(2);
  });

  it("returns undefined for missing keys", () => {
    const ctx = new ToolContext();
    expect(ctx.get("missing")).toBeUndefined();
  });

  it("checks key existence with has()", () => {
    const ctx = new ToolContext({ exists: true });
    expect(ctx.has("exists")).toBe(true);
    expect(ctx.has("nope")).toBe(false);
  });

  it("deletes keys", () => {
    const ctx = new ToolContext({ key: "val" });
    expect(ctx.delete("key")).toBe(true);
    expect(ctx.has("key")).toBe(false);
    expect(ctx.delete("key")).toBe(false);
  });

  it("toJSON returns a copy (not a reference)", () => {
    const ctx = new ToolContext({ a: 1 });
    const snapshot = ctx.toJSON();
    snapshot.a = 999;
    expect(ctx.get("a")).toBe(1);
  });
});
