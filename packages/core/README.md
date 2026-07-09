# @lahin31/debugcontext-core

**Zero-configuration debugging context SDK for Node.js.**

When your application throws, DebugContext automatically captures everything you need to investigate the issue — request details, runtime state, system resources, Git metadata, and a full error trace — structured into one clean `Incident` object.

> DebugContext is **not** an error tracking service (like Sentry) and **not** a logging library (like Winston). It generates structured debug context so you can ship it wherever you need — a file, a webhook, Slack, your own database.

[![npm version](https://img.shields.io/npm/v/@lahin31/debugcontext-core)](https://www.npmjs.com/package/@lahin31/debugcontext-core)
[![npm downloads](https://img.shields.io/npm/dm/@lahin31/debugcontext-core)](https://www.npmjs.com/package/@lahin31/debugcontext-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Install

```bash
npm install @lahin31/debugcontext-core
```

For Express support, also install the adapter:

```bash
npm install @lahin31/debugcontext-core @lahin31/debugcontext-express
```

---

## Quick Start

```typescript
import DebugContext from '@lahin31/debugcontext-core';

// 1. Initialise once at startup
DebugContext.init();

// 2. Capture any error
try {
  throw new Error('database connection failed');
} catch (err) {
  const incident = DebugContext.capture(err);

  // Print to console
  DebugContext.toConsole(incident);

  // Get as JSON string
  console.log(DebugContext.toJSON(incident));

  // Write to NDJSON file
  DebugContext.toFile(incident, { path: 'logs/incidents.ndjson' });
}
```

---

## Express Integration

```typescript
import express from 'express';
import DebugContext from '@lahin31/debugcontext-core';
import DebugContextExpress from '@lahin31/debugcontext-express';

DebugContext.init();

const app = express();
app.use(express.json());

// Optional: mount before routes to enable route param capture
app.use(DebugContextExpress.requestMiddleware());

// Your routes
app.get('/users/:id', (req, res) => {
  throw new Error('User not found'); // captured automatically
});

// Mount error middleware LAST
app.use(DebugContextExpress.errorMiddleware());

app.listen(3000);
```

---

## What an Incident looks like

```json
{
  "incidentId": "3f2a1b4c-8e1d-4a2f-b3c9-1d2e3f4a5b6c",
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
    "memory": {
      "rss": 52428800,
      "heapTotal": 30408704,
      "heapUsed": 18200000,
      "external": 1234,
      "arrayBuffers": 456
    },
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
  // Extra header names to redact
  sensitiveHeaders: ['x-my-secret-header'],

  // Extra body fields to redact
  sensitiveFields: ['myApiKey', 'internalToken'],

  // Hook called after every captured incident
  onIncident: async (incident) => {
    await fetch('https://my-backend.example.com/incidents', {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  },

  // Attach global uncaughtException + unhandledRejection handlers
  // Default: true
  captureGlobalErrors: true,
});
```

---

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

---

### `DebugContext.toConsole(incident?)`

Prints a human-readable incident summary to `console.error`. Defaults to the last captured incident.

```
────────────────────────────────────────────────────────────
🐛  DebugContext Incident  3f2a1b4c-...
────────────────────────────────────────────────────────────

  Error      : Error: User not found
  Timestamp  : 2024-01-15T10:30:00.000Z
  Environment: production
  Node       : v20.11.0
  Commit     : a1b2c3d4 (main)
  Heap       : 59.8% used

  Request:
    GET /users/42
    IP        : 127.0.0.1
    User-Agent: curl/8.4.0

  Stack:
    Error: User not found
        at /app/routes/users.js:12:9
```

---

### `DebugContext.toJSON(incident?)`

Returns the incident as a pretty-printed JSON string.

```typescript
const json = DebugContext.toJSON();
fs.writeFileSync('incident.json', json ?? '');
```

---

### `DebugContext.toFile(incident?, options?)`

Appends the incident as a single line to an NDJSON file. Creates the file and parent directories if they don't exist.

```typescript
// Default path: incidents.ndjson in cwd
DebugContext.toFile(incident);

// Custom path
DebugContext.toFile(incident, { path: 'logs/incidents.ndjson' });

// Use with onIncident hook to log every error automatically
DebugContext.init({
  onIncident: (i) => DebugContext.toFile(i, { path: 'logs/incidents.ndjson' }),
});
```

---

### `DebugContext.middleware()`

Returns a framework-agnostic capture function. Use this when building custom adapters.

```typescript
const capture = DebugContext.middleware();
const incident = capture(error, requestContext);
```

---

## Automatic Redaction

Sensitive values are **always** replaced with `"[REDACTED]"` before they appear in an Incident.

**Headers (always redacted):**
`authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, `x-access-token`, `proxy-authorization`, `www-authenticate`

**Body fields (always redacted):**
`password`, `secret`, `token`, `apikey`, `access_token`, `refresh_token`, `credit_card`, `cvv`, `ssn`, `private_key`, and more.

Add extra names via `init()`:

```typescript
DebugContext.init({
  sensitiveHeaders: ['x-internal-token'],
  sensitiveFields: ['myCustomSecret'],
});
```

---

## Tree-shakable named exports

```typescript
import { init, capture, toJSON, toConsole, toFile, middleware } from '@lahin31/debugcontext-core';

// Individual collectors — compose your own pipeline
import { collectRuntime, collectSystem, collectGit, collectError } from '@lahin31/debugcontext-core';

// Redaction utilities — useful for custom adapters
import { redactHeaders, redactBody } from '@lahin31/debugcontext-core';
```

---

## Design Principles

- **Zero config** — works with a single `DebugContext.init()` call
- **No external dependencies** — only Node.js built-ins (`crypto`, `os`, `child_process`, `fs`)
- **No cloud, no database** — incidents are plain objects, send them anywhere
- **Tree-shakable** — unused collectors are dropped by bundlers
- **Dual ESM/CJS** — works in both `import` and `require` projects

---

## Related Packages

- [`@lahin31/debugcontext-express`](https://www.npmjs.com/package/@lahin31/debugcontext-express) — Express middleware adapter

---

## License

MIT © [lahin31](https://github.com/lahin31)
