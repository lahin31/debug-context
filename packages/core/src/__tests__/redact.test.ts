import { describe, expect, it } from "vitest";
import { redactBody, redactHeaders } from "../utils/redact.js";

describe("redactHeaders", () => {
  it("redacts built-in sensitive headers", () => {
    const headers = {
      authorization: "Bearer secret-token",
      "content-type": "application/json",
      cookie: "session=abc123",
      "x-api-key": "my-api-key",
    };
    const result = redactHeaders(headers);
    expect(result["authorization"]).toBe("[REDACTED]");
    expect(result["cookie"]).toBe("[REDACTED]");
    expect(result["x-api-key"]).toBe("[REDACTED]");
    expect(result["content-type"]).toBe("application/json");
  });

  it("redacts extra caller-supplied header names", () => {
    const headers = { "x-custom-secret": "top-secret", accept: "text/html" };
    const result = redactHeaders(headers, ["x-custom-secret"]);
    expect(result["x-custom-secret"]).toBe("[REDACTED]");
    expect(result["accept"]).toBe("text/html");
  });

  it("is case-insensitive for built-in sensitive headers", () => {
    const result = redactHeaders({ Authorization: "Bearer token" });
    expect(result["Authorization"]).toBe("[REDACTED]");
  });

  it("joins array header values", () => {
    const result = redactHeaders({ accept: ["text/html", "application/json"] });
    expect(result["accept"]).toBe("text/html, application/json");
  });

  it("omits undefined header values", () => {
    const result = redactHeaders({ "x-missing": undefined });
    expect(result["x-missing"]).toBeUndefined();
  });
});

describe("redactBody", () => {
  it("redacts built-in sensitive fields", () => {
    const body = { username: "alice", password: "hunter2", age: 30 };
    const result = redactBody(body) as typeof body;
    expect(result.password).toBe("[REDACTED]");
    expect(result.username).toBe("alice");
    expect(result.age).toBe(30);
  });

  it("redacts nested sensitive fields", () => {
    const body = { user: { token: "secret", name: "Bob" } };
    const result = redactBody(body) as { user: { token: string; name: string } };
    expect(result.user.token).toBe("[REDACTED]");
    expect(result.user.name).toBe("Bob");
  });

  it("handles arrays", () => {
    const body = [{ password: "pw1" }, { password: "pw2" }];
    const result = redactBody(body) as Array<{ password: string }>;
    expect(result[0]?.password).toBe("[REDACTED]");
    expect(result[1]?.password).toBe("[REDACTED]");
  });

  it("redacts extra caller-supplied field names", () => {
    const body = { mySecret: "shh", name: "Carol" };
    const result = redactBody(body, ["mySecret"]) as typeof body;
    expect(result.mySecret).toBe("[REDACTED]");
    expect(result.name).toBe("Carol");
  });

  it("returns primitives unchanged", () => {
    expect(redactBody("hello")).toBe("hello");
    expect(redactBody(42)).toBe(42);
    expect(redactBody(null)).toBe(null);
  });

  it("is case-insensitive for field names", () => {
    const body = { PASSWORD: "secret" };
    const result = redactBody(body) as { PASSWORD: string };
    expect(result.PASSWORD).toBe("[REDACTED]");
  });
});
