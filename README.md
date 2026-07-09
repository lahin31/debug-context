# DebugContext

**Zero-configuration debugging context for Node.js.**

When your application throws, DebugContext automatically captures everything you need to investigate the issue — request details, runtime state, system resources, Git metadata, and a full error trace — all in one structured `Incident` object.

> DebugContext is **not** an error tracking service (like Sentry) and **not** a logging library (like Winston). It is a context-generation SDK: it structures the debug information so you can ship it wherever you need it.

---

## Packages

| Package | Version | Description |
|---|---|---|
| [`@lahin31/debugcontext-core`](./packages/core) | 0.1.0 | Framework-agnostic core SDK |
| [`@lahin31/debugcontext-express`](./packages/express) | 0.1.0 | Express 4/5 middleware adapter |

---

## Quick Start

### Install

```bash
npm install @lahin31/debugcontext-core @lahin31/debugcontext-express
```

### Setup (Express)

```typescript
import express from 'express';
import DebugContext from '@lahin31/debugcontext-core';
import DebugContextExpress from '@lahin31/debugcontext-express';

// 1. Initialise once at startup
DebugContext.init();

const app = express();
app.use(express.json());

// 2. Your routes
app.get('/users/:id', (req, res) => {
  throw new Error('User not found'); // DebugContext captures this automatically
});

// 3. Mount error middleware AFTER all routes
app.use(DebugContextExpress.errorMiddleware());

app.listen(3000);
```

### What you get

Every captured error produces an `Incident` that looks like this:

```json
{
  "incidentId": "3f2a1b4c-...",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "request": {
    "method": "GET",
    "url": "/users/42",
    "params": { "id": "42" },
    "query": {},
    "body": null,
    "headers": {
      "authorization": "[REDACTED]",
      "content-type": "application/json"
    },
    "ip": "127.0.0.1",
    "userAgent": "Mozilla/5.0 ..."
  },
  "runtime": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "environment": "production",
    "nodeVersion": "v20.11.0",
    "pid": 1234,
    "hostname": "prod-server-1",
    "uptimeSeconds": 3600.5,
    "workingDirectory": "/app"
  },
  "system": {
    "memory": { "rss": 52428800, "heapTotal": 30408704, "heapUsed": 18200000, "external": 1234, "arrayBuffers": 456 },
    "heapUsagePercent": 59.8,
    "cpuLoadAvg": [0.5, 0.3, 0.2],
    "platform": "linux",
    "arch": "x64",
    "totalMemory": 8589934592,
    "freeMemory": 2147483648
  },
  "git": {
    "commitHash": "a1b2c3d4",
    "branch": "main",
    "packageVersion": "1.2.3"
  },
  "error": {
    "name": "Error",
    "message": "User not found",
    "stack": "Error: User not found\n    at ...",
    "cause": null
  }
}
```

---

## API

### `DebugContext.init(options?)`

Initialises the SDK. Call once at startup.

```typescript
DebugContext.init({
  // Extra header names to redact (merged with built-in list)
  sensitiveHeaders: ['x-my-secret-header'],

  // Extra body fields to redact (merged with built-in list)
  sensitiveFields: ['myApiKey', 'internalToken'],

  // Hook called after every captured incident
  onIncident: async (incident) => {
    await fetch('https://my-backend.example.com/incidents', {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  },

  // Attach global uncaughtException + unhandledRejection handlers (default: true)
  captureGlobalErrors: true,
});
```

### `DebugContext.capture(error, requestContext?)`

Manually captures any error. Returns the `Incident`.

```typescript
try {
  await riskyDatabaseCall();
} catch (err) {
  const incident = DebugContext.capture(err);
  DebugContext.toConsole(incident);
}
```

### `DebugContext.toJSON(incident?)`

Returns the last (or given) incident as a pretty-printed JSON string.

```typescript
const json = DebugContext.toJSON();
fs.writeFileSync('incident.json', json ?? '');
```

### `DebugContext.toConsole(incident?)`

Prints a human-readable incident summary to `console.error`.

### `DebugContextExpress.errorMiddleware(options?)`

Express error-handling middleware. Mount **after** all routes.

```typescript
app.use(DebugContextExpress.errorMiddleware({
  rethrow: true,     // pass error to next handler (default: true)
  toConsole: true,   // print to console (default: true in non-production)
}));
```

### `DebugContextExpress.requestMiddleware()`

Optional request-tagging middleware. Mount **before** routes.

---

## Security: Automatic Redaction

The following values are **always** redacted before appearing in an Incident:

**Headers:** `authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, `x-access-token`, `proxy-authorization`, `www-authenticate`

**Body fields:** `password`, `secret`, `token`, `apikey`, `access_token`, `refresh_token`, `credit_card`, `cvv`, `ssn`, `private_key`, and more.

All values are replaced with `"[REDACTED]"`. Add extra names via `init()` options.

---

## Design Principles

- **Zero config** — works with a single `DebugContext.init()` call.
- **Tree-shakable** — all exports are named; unused collectors are dropped by bundlers.
- **No external dependencies** — only Node.js built-ins (`crypto`, `os`, `child_process`).
- **No cloud, no database** — incidents are plain JavaScript objects. Ship them anywhere you want.
- **Modular adapters** — `@lahin31/debugcontext-core` is framework-agnostic. Adapters (`@lahin31/debugcontext-express`, and future `@debugcontext/fastify`, `@debugcontext/nestjs`) are separate packages.

---

## Development

```bash
# Install all workspace dependencies
npm install

# Build all packages
npm run build

# Run all tests
npm test

# Run a specific package's tests
npm test --workspace=packages/core
```

---

## Roadmap

- [ ] `@debugcontext/fastify` adapter
- [ ] `@debugcontext/nestjs` adapter
- [ ] `DebugContext.toFile()` — write incidents to NDJSON
- [ ] `DebugContext.createServer()` — local debug UI server
- [ ] OpenTelemetry trace context enrichment

---

## License

MIT © DebugContext Contributors
