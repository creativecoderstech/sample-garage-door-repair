import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// Release acceptance uses the staged tree, not accidental untracked imports.
// It creates no commit, does not publish, and never copies environment secrets.
const run = (command, args, cwd, options = {}) => {
  const env = { ...process.env, CI: "true" };
  delete env.PORT;
  delete env.BASE_PATH;
  const result = spawnSync(command, args, {
    cwd, encoding: "utf8", stdio: "inherit",
    env,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}).`);
  return result.stdout;
};
const root = process.cwd();
const tree = run("git", ["write-tree"], root, { stdio: "pipe" }).trim();
const directory = await mkdtemp(join(tmpdir(), "cumming-staged-release-"));
try {
  const archive = run("git", ["archive", tree], root, {
    stdio: "pipe", encoding: null, maxBuffer: 128 * 1024 * 1024,
  });
  run("tar", ["-xf", "-", "-C", directory], root, { input: archive, stdio: ["pipe", "inherit", "inherit"] });
  run("pnpm", ["install", "--offline", "--frozen-lockfile"], directory);
  run("pnpm", ["run", "typecheck"], directory);
  run("pnpm", ["--filter", "@workspace/sample-garage-door-repair", "run", "build:pages"], directory);
  run("pnpm", ["--filter", "@workspace/sample-garage-door-repair", "run", "verify:cloudflare-release"], directory);
  console.log("Clean staged-source Pages release passed. No migration or deployment was performed.");
} finally {
  await rm(directory, { recursive: true, force: true });
}