import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { capture, init } from "../debug-context.js";
import { toFile } from "../utils/to-file.js";

const TMP_DIR = join(process.cwd(), "src/__tests__/tmp");
const TMP_FILE = join(TMP_DIR, "test-incidents.ndjson");

beforeEach(() => {
  init({ captureGlobalErrors: false });
});

afterEach(() => {
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
});

describe("toFile", () => {
  it("creates the file and writes a valid NDJSON line", () => {
    const incident = capture(new Error("file test"));
    toFile(incident, { path: TMP_FILE });

    expect(existsSync(TMP_FILE)).toBe(true);
    const content = readFileSync(TMP_FILE, "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!) as { error: { message: string } };
    expect(parsed.error.message).toBe("file test");
  });

  it("appends multiple incidents as separate lines", () => {
    toFile(capture(new Error("first")), { path: TMP_FILE });
    toFile(capture(new Error("second")), { path: TMP_FILE });
    toFile(capture(new Error("third")), { path: TMP_FILE });

    const lines = readFileSync(TMP_FILE, "utf8").trim().split("\n");
    expect(lines).toHaveLength(3);
    const messages = lines.map((l) => (JSON.parse(l) as { error: { message: string } }).error.message);
    expect(messages).toEqual(["first", "second", "third"]);
  });

  it("creates nested directories via mkdirp", () => {
    const deepPath = join(TMP_DIR, "a/b/c/incidents.ndjson");
    const incident = capture(new Error("deep"));
    toFile(incident, { path: deepPath });
    expect(existsSync(deepPath)).toBe(true);
  });

  it("each line is valid JSON ending with newline", () => {
    toFile(capture(new Error("newline check")), { path: TMP_FILE });
    const raw = readFileSync(TMP_FILE, "utf8");
    expect(raw.endsWith("\n")).toBe(true);
  });
});
