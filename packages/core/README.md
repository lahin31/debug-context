# @debugcontext/core

Framework-agnostic core SDK for [DebugContext](../../README.md).

## Install

```bash
npm install @debugcontext/core
```

## Usage

```typescript
import DebugContext from '@debugcontext/core';

DebugContext.init();

try {
  throw new Error('database connection failed');
} catch (err) {
  const incident = DebugContext.capture(err);
  DebugContext.toConsole(incident);

  // Or get it as JSON
  console.log(DebugContext.toJSON(incident));
}
```

## Tree-shakable named exports

```typescript
import { init, capture, toJSON, toConsole } from '@debugcontext/core';
import { collectRuntime, collectSystem, collectGit } from '@debugcontext/core';
import { redactHeaders, redactBody } from '@debugcontext/core';
```

See the [root README](../../README.md) for full API documentation.
