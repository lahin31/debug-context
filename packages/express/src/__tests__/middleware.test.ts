import DebugContext from "@lahin31/debugcontext-core";
import express, { type Application } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import DebugContextExpress from "../index.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function buildApp(overrideOptions?: Parameters<typeof DebugContextExpress.errorMiddleware>[0]): Application {
  const app = express();
  app.use(express.json());
  app.use(DebugContextExpress.requestMiddleware());

  // A route that always throws
  app.get("/boom", (_req, _res) => {
    throw new Error("route exploded");
  });

  // A route that calls next(err) — async style
  app.get("/async-boom", (_req, _res, next) => {
    next(new Error("async route exploded"));
  });

  // A route that works fine
  app.get("/ok", (_req, res) => {
    res.json({ status: "ok" });
  });

  // A POST route for body / header redaction tests
  app.post("/login", (_req, _res, next) => {
    next(new Error("login failed"));
  });

  // DebugContext error middleware (must be last)
  app.use(
    DebugContextExpress.errorMiddleware({
      rethrow: true,
      toConsole: false,
      ...overrideOptions,
    })
  );

  // Final fallback error handler so Express sends a response
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _next: express.NextFunction
    ) => {
      res.status(500).json({ error: err.message });
    }
  );

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeAll(() => {
  DebugContext.init({ captureGlobalErrors: false });
});

describe("errorMiddleware", () => {
  it("captures a synchronous route error as an Incident", async () => {
    const hook = vi.fn();
    DebugContext.init({ captureGlobalErrors: false, onIncident: hook, toConsole: false } as Parameters<typeof DebugContext.init>[0]);

    const app = buildApp({ rethrow: true, toConsole: false });
    const res = await request(app).get("/boom");

    expect(res.status).toBe(500);
    await new Promise((r) => setTimeout(r, 20)); // wait for async hook

    expect(hook).toHaveBeenCalledTimes(1);
    const [incident] = hook.mock.calls[0] as [import("@lahin31/debugcontext-core").Incident];
    expect(incident.error.message).toBe("route exploded");
    expect(incident.request?.method).toBe("GET");
    expect(incident.request?.url).toBe("/boom");
  });

  it("captures an async route error passed via next(err)", async () => {
    const hook = vi.fn();
    DebugContext.init({ captureGlobalErrors: false, onIncident: hook });

    const app = buildApp({ toConsole: false });
    await request(app).get("/async-boom");
    await new Promise((r) => setTimeout(r, 20));

    expect(hook).toHaveBeenCalledTimes(1);
    const [incident] = hook.mock.calls[0] as [import("@lahin31/debugcontext-core").Incident];
    expect(incident.error.message).toBe("async route exploded");
  });

  it("does not interfere with successful routes", async () => {
    const app = buildApp({ toConsole: false });
    const res = await request(app).get("/ok");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("attaches the incident to req.debugContextIncident", async () => {
    let capturedIncident: import("@lahin31/debugcontext-core").Incident | undefined;

    const app = express();
    app.use(express.json());

    app.get("/fail", (_req, _res) => {
      throw new Error("fail");
    });

    app.use(DebugContextExpress.errorMiddleware({ rethrow: true, toConsole: false }));

    // A custom handler that reads the incident off the request
    app.use(
      (
        _err: Error,
        req: express.Request,
        res: express.Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _next: express.NextFunction
      ) => {
        capturedIncident = req.debugContextIncident;
        res.status(500).json({ incidentId: capturedIncident?.incidentId });
      }
    );

    const res = await request(app).get("/fail");
    expect(res.status).toBe(500);
    expect(res.body.incidentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});

describe("request context extraction", () => {
  it("redacts Authorization header", async () => {
    const hook = vi.fn();
    DebugContext.init({ captureGlobalErrors: false, onIncident: hook });

    const app = buildApp({ toConsole: false });
    await request(app)
      .post("/login")
      .set("Authorization", "Bearer super-secret")
      .send({ username: "alice", password: "hunter2" });

    await new Promise((r) => setTimeout(r, 20));

    const [incident] = hook.mock.calls[0] as [import("@lahin31/debugcontext-core").Incident];
    expect(incident.request?.headers["authorization"]).toBe("[REDACTED]");
  });

  it("redacts sensitive body fields", async () => {
    const hook = vi.fn();
    DebugContext.init({ captureGlobalErrors: false, onIncident: hook });

    const app = buildApp({ toConsole: false });
    await request(app)
      .post("/login")
      .send({ username: "alice", password: "hunter2" });

    await new Promise((r) => setTimeout(r, 20));

    const [incident] = hook.mock.calls[0] as [import("@lahin31/debugcontext-core").Incident];
    const body = incident.request?.body as { username: string; password: string };
    expect(body.password).toBe("[REDACTED]");
    expect(body.username).toBe("alice");
  });

  it("captures route params", async () => {
    const hook = vi.fn();
    // Re-init with a fresh hook so previous test's hook doesn't bleed in
    DebugContext.init({ captureGlobalErrors: false, onIncident: hook, toConsole: false } as Parameters<typeof DebugContext.init>[0]);

    const app = express();
    // requestMiddleware stashes params before Express clears them on error propagation
    app.use(DebugContextExpress.requestMiddleware());
    app.get("/users/:id", (_req, _res) => {
      throw new Error("user not found");
    });
    app.use(DebugContextExpress.errorMiddleware({ toConsole: false }));
    app.use((_err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).end();
    });

    await request(app).get("/users/42");
    // Wait long enough for the async onIncident hook to fire
    await new Promise((r) => setTimeout(r, 50));

    expect(hook).toHaveBeenCalledTimes(1);
    const [incident] = hook.mock.calls[0] as [import("@lahin31/debugcontext-core").Incident];
    expect(incident.request?.params["id"]).toBe("42");
  });
});
