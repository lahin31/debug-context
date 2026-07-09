# @lahin31/debugcontext-express

**Express.js adapter for DebugContext** — automatically captures every route error as a structured `Incident` with full request context, runtime info, system stats, and git metadata.

[![npm version](https://img.shields.io/npm/v/@lahin31/debugcontext-express)](https://www.npmjs.com/package/@lahin31/debugcontext-express)
[![npm downloads](https://img.shields.io/npm/dm/@lahin31/debugcontext-express)](https://www.npmjs.com/package/@lahin31/debugcontext-express)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Install

```bash
npm install @lahin31/debugcontext-core @lahin31/debugcontext-express
```

---

## Setup

```typescript
import express from 'express';
import DebugContext from '@lahin31/debugcontext-core';
import DebugContextExpress from '@lahin31/debugcontext-express';

// 1. Initialise once at startup
DebugContext.init();

const app = express();
app.use(express.json());

// 2. Optional — mount before routes to enable route param capture
app.use(DebugContextExpress.requestMiddleware());

// 3. Your routes
app.get('/users/:id', (req, res) => {
  throw new Error('User not found'); // captured automatically
});

app.post('/login', (req, res) => {
  // passwords are auto-redacted in the incident
  throw new Error('Invalid credentials');
});

// 4. Mount error middleware AFTER all routes
app.use(DebugContextExpress.errorMiddleware());

app.listen(3000);
```

---

## What gets captured

Every route error produces a full `Incident`:

```json
{
  "incidentId": "3f2a1b4c-...",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "request": {
    "method": "POST",
    "url": "/login",
    "params": {},
    "query": {},
    "body": {
      "username": "alice",
      "password": "[REDACTED]"
    },
    "headers": {
      "authorization": "[REDACTED]",
      "content-type": "application/json"
    },
    "ip": "127.0.0.1",
    "userAgent": "Mozilla/5.0 ..."
  },
  "runtime": { "nodeVersion": "v20.11.0", "environment": "production", "pid": 1234, "..." : "..." },
  "system": { "heapUsagePercent": 59.8, "...": "..." },
  "git": { "commitHash": "a1b2c3d4", "branch": "main", "packageVersion": "1.2.3" },
  "error": {
    "name": "Error",
    "message": "Invalid credentials",
    "stack": "Error: Invalid credentials\n    at ..."
  }
}
```

---

## API

### `DebugContextExpress.errorMiddleware(options?)`

Express 4-argument error middleware. Mount **after all routes**.

```typescript
app.use(DebugContextExpress.errorMiddleware({
  // Pass the error to the next handler after capturing (default: true)
  rethrow: true,

  // Print incident to console (default: true in non-production)
  toConsole: true,
}));
```

The captured incident is also attached to `req.debugContextIncident` for use in downstream handlers:

```typescript
app.use((err, req, res, next) => {
  const { incidentId } = req.debugContextIncident ?? {};
  res.status(500).json({ error: err.message, incidentId });
});
```

---

### `DebugContextExpress.requestMiddleware()`

Optional middleware that enables **route parameter capture** even when Express clears `req.params` during error propagation.

Mount **before your routes**:

```typescript
app.use(DebugContextExpress.requestMiddleware());

app.get('/users/:id', (req, res) => {
  throw new Error('not found');
  // incident.request.params.id === '42' ✓
});
```

Without this middleware, params will still be captured for `next(err)`-style async errors. It is only required for synchronous throws in parameterised routes.

---

## Automatic Redaction

Sensitive data is **always redacted** before appearing in an Incident.

**Headers:** `authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, and more.

**Body fields:** `password`, `secret`, `token`, `apikey`, `access_token`, `refresh_token`, `credit_card`, `cvv`, `ssn`, `private_key`, and more.

Add extra fields via `DebugContext.init()`:

```typescript
DebugContext.init({
  sensitiveHeaders: ['x-internal-token'],
  sensitiveFields: ['myCustomSecret'],
});
```

---

## Send incidents anywhere

Use the `onIncident` hook to ship incidents to your own storage or alerting:

```typescript
DebugContext.init({
  // Write to file
  onIncident: (i) => DebugContext.toFile(i, { path: 'logs/incidents.ndjson' }),

  // Send to a webhook
  onIncident: async (i) => {
    await fetch('https://my-alerting-service.example.com/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(i),
    });
  },
});
```

---

## Related Packages

- [`@lahin31/debugcontext-core`](https://www.npmjs.com/package/@lahin31/debugcontext-core) — framework-agnostic core SDK

---

## License

MIT © [lahin31](https://github.com/lahin31)
