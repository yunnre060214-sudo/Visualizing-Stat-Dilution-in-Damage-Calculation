import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const vitestCli = path.join(repositoryRoot, "node_modules/vitest/vitest.mjs");

test("Vitest discovery stays out of nested Git worktrees", () => {
  const result = spawnSync(process.execPath, [vitestCli, "list"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 4 * 1024 * 1024,
  });

  assert.equal(result.status, 0, result.stderr.slice(0, 4_000));
  assert.equal(
    result.stdout.includes(".worktrees/"),
    false,
    "Vitest collected tests from a nested worktree",
  );
});
