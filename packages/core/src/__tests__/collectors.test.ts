import { describe, expect, it } from "vitest";
import { collectError } from "../collectors/error.js";
import { collectRuntime } from "../collectors/runtime.js";
import { collectSystem } from "../collectors/system.js";

describe("collectError", () => {
  it("serialises a standard Error", () => {
    const err = new Error("test error");
    const ctx = collectError(err);
    expect(ctx.name).toBe("Error");
    expect(ctx.message).toBe("test error");
    expect(ctx.stack).toContain("Error: test error");
    expect(ctx.cause).toBeUndefined();
  });

  it("serialises a custom Error subclass", () => {
    class MyError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = "MyError";
      }
    }
    const ctx = collectError(new MyError("custom"));
    expect(ctx.name).toBe("MyError");
    expect(ctx.message).toBe("custom");
  });

  it("serialises an Error with cause", () => {
    const cause = new Error("root cause");
    const err = new Error("outer", { cause });
    const ctx = collectError(err);
    expect(ctx.cause).toMatchObject({ name: "Error", message: "root cause" });
  });

  it("handles non-Error throws (string)", () => {
    const ctx = collectError("something went wrong");
    expect(ctx.name).toBe("UnknownError");
    expect(ctx.message).toBe("something went wrong");
    expect(ctx.stack).toBeUndefined();
  });

  it("handles non-Error throws (plain object)", () => {
    const ctx = collectError({ code: 42 });
    expect(ctx.name).toBe("UnknownError");
    expect(ctx.message).toBe("[object Object]");
  });
});

describe("collectRuntime", () => {
  it("returns all required fields", () => {
    const ctx = collectRuntime();
    expect(ctx.nodeVersion).toMatch(/^v\d+\./);
    expect(ctx.pid).toBeGreaterThan(0);
    expect(typeof ctx.hostname).toBe("string");
    expect(ctx.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(typeof ctx.workingDirectory).toBe("string");
    expect(typeof ctx.environment).toBe("string");
    // ISO timestamp
    expect(() => new Date(ctx.timestamp)).not.toThrow();
  });
});

describe("collectSystem", () => {
  it("returns all required fields", () => {
    const ctx = collectSystem();
    expect(ctx.memory.heapUsed).toBeGreaterThan(0);
    expect(ctx.heapUsagePercent).toBeGreaterThanOrEqual(0);
    expect(ctx.heapUsagePercent).toBeLessThanOrEqual(100);
    expect(ctx.cpuLoadAvg).toHaveLength(3);
    expect(typeof ctx.platform).toBe("string");
    expect(typeof ctx.arch).toBe("string");
    expect(ctx.totalMemory).toBeGreaterThan(0);
  });
});
