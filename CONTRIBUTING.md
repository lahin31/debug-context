# Contributing to DebugContext

Thanks for your interest in contributing. This document covers everything you need to get started.

---

## Project structure

```
debugcontext/
├── packages/
│   ├── core/        @debugcontext/core  — framework-agnostic SDK
│   └── express/     @debugcontext/express — Express adapter
├── examples/
│   └── express-app/ — runnable demo application
├── .github/
│   └── workflows/   — CI pipelines
└── tsconfig.base.json
```

This is an **npm workspace** monorepo. All packages share a single `node_modules` at the root.

---

## Prerequisites

- Node.js **20+**
- npm **9+** (workspaces support)
- Git

---

## Setup

```bash
git clone https://github.com/debugcontext/debugcontext.git
cd debugcontext
npm install
npm run build
```

---

## Development workflow

### Build all packages

```bash
npm run build
```

### Run all tests

```bash
npm test
```

### Work on a specific package

```bash
# Watch mode — rebuilds on file changes
npm run dev --workspace=packages/core
npm run dev --workspace=packages/express

# Run only that package's tests
npm test --workspace=packages/core
```

### Type-check without building

```bash
npm run typecheck
```

---

## Adding a new framework adapter

1. Create a new package under `packages/` — e.g. `packages/fastify`
2. Copy the structure from `packages/express` as a starting point
3. The adapter must:
   - Depend on `@debugcontext/core`
   - Peer-depend on the target framework
   - Export a middleware / plugin that calls `DebugContext.capture(err, requestCtx)` with a populated `RequestContext`
   - Re-export `extractRequest` or an equivalent helper

---

## Commit convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Fastify adapter
fix: recover route params after Express error propagation
docs: add onIncident hook example to README
chore: upgrade vitest to 2.x
test: add coverage for non-Error throws
```

Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `ci`

---

## Pull request checklist

- [ ] `npm run build` passes with no errors
- [ ] `npm test` passes (all tests green)
- [ ] New behaviour is covered by tests
- [ ] Public API changes are documented in JSDoc and README
- [ ] No new external runtime dependencies introduced in `packages/core`

---

## Reporting bugs

Open an issue with:

1. Node.js version (`node --version`)
2. Framework and version (e.g. Express 4.18)
3. Minimal reproduction — ideally a code snippet or repo link
4. What you expected vs. what happened
5. The full incident JSON if available

---

## License

By contributing you agree that your contributions will be licensed under the [MIT License](./LICENSE).
