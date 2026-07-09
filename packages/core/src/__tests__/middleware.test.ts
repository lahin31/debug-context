import { describe, expect, it } from "vitest";
import { init, middleware } from "../debug-context.js";
import type { Incident } from "../types.js";

describe("DebugContext.middleware()", () => {
  it("returns a capture function", () => {
    init({ captureGlobalErrors: false });
    const mw = middleware();
    expect(typeof mw).toBe("function");
  });

  it("captures an error and returns an Incident", () => {
    init({ captureGlobalErrors: false });
    const mw = middleware();
    const incident = mw(new Error("middleware test"));
    expect(incident.error.message).toBe("middleware test");
    expect(incident.incidentId).toBeDefined();
  });

  it("accepts an optional request context", () => {
    init({ captureGlobalErrors: false });
    const mw = middleware();
    const incident = mw(new Error("with request"), {
      method: "DELETE",
      url: "/api/items/5",
      params: { id: "5" },
      query: {},
      body: null,
      headers: {},
      ip: "10.0.0.1",
      userAgent: "test",
    });
    expect(incident.request?.method).toBe("DELETE");
    expect(incident.request?.params["id"]).toBe("5");
  });

  it("each call to middleware() returns an independent capture function", () => {
    init({ captureGlobalErrors: false });
    const mw1 = middleware();
    const mw2 = middleware();
    const i1 = mw1(new Error("one"));
    const i2 = mw2(new Error("two"));
    expect(i1.incidentId).not.toBe(i2.incidentId);
    expect(i1.error.message).toBe("one");
    expect(i2.error.message).toBe("two");
  });

  it("returned incident passes through onIncident hook", async () => {
    const received: Incident[] = [];
    init({ captureGlobalErrors: false, onIncident: (i) => received.push(i) });
    const mw = middleware();
    mw(new Error("hook check"));
    await new Promise((r) => setTimeout(r, 20));
    expect(received).toHaveLength(1);
    expect(received[0]?.error.message).toBe("hook check");
  });
});
