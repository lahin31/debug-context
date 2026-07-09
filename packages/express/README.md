# @lahin31/debugcontext-express

Express.js adapter for [DebugContext](../../README.md).

## Install

```bash
npm install @lahin31/debugcontext-core @lahin31/debugcontext-express
```

## Usage

```typescript
import express from 'express';
import DebugContext from '@lahin31/debugcontext-core';
import DebugContextExpress from '@lahin31/debugcontext-express';

DebugContext.init();

const app = express();
app.use(express.json());
app.use(DebugContextExpress.requestMiddleware()); // optional

// ... your routes ...

// Error middleware must be mounted LAST
app.use(DebugContextExpress.errorMiddleware({
  rethrow: true,
  toConsole: process.env.NODE_ENV !== 'production',
}));
```

The incident is also attached to `req.debugContextIncident` for downstream handlers.

See the [root README](../../README.md) for full API documentation.
