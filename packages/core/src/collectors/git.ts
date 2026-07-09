/**
 * @module collectors/git
 * Resolves Git metadata and package version at SDK initialisation time.
 *
 * All resolution is synchronous and happens once — results are cached so
 * repeated incident captures don't spawn child processes.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GitContext } from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runGit(args: string): string {
  try {
    return execSync(`git ${args}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    }).trim();
  } catch {
    return "unknown";
  }
}

function resolvePackageVersion(): string {
  let dir = process.cwd();

  // Walk up the directory tree looking for package.json
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) {
      try {
        const raw = readFileSync(candidate, "utf8");
        const pkg = JSON.parse(raw) as { version?: unknown };
        if (typeof pkg.version === "string" && pkg.version) {
          return pkg.version;
        }
      } catch {
        // malformed package.json — keep walking
      }
    }
    const parent = join(dir, "..");
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Cached resolution
// ---------------------------------------------------------------------------

let cachedGitContext: GitContext | null = null;

/**
 * Returns the Git context.  Resolution runs once and is then cached for the
 * lifetime of the process.
 */
export function collectGit(): GitContext {
  if (cachedGitContext !== null) return cachedGitContext;

  cachedGitContext = {
    commitHash: runGit("rev-parse --short=8 HEAD"),
    branch: runGit("rev-parse --abbrev-ref HEAD"),
    packageVersion: resolvePackageVersion(),
  };

  return cachedGitContext;
}

/**
 * Clears the cached Git context.  Useful in tests.
 * @internal
 */
export function _clearGitCache(): void {
  cachedGitContext = null;
}
