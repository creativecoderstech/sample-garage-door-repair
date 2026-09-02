#!/usr/bin/env tsx
/**
 * scripts/release.ts
 *
 * Usage:  pnpm release patch | minor | major
 *
 * What it does:
 *  1. Validates: must be on `develop`, no uncommitted changes
 *  2. Bumps the version in all workspace package.json files (lockstep)
 *  3. Commits the bump on develop  →  "chore: release vX.Y.Z"
 *  4. Pushes develop to origin
 *  5. Merges develop → main (fast-forward only)
 *  6. Creates an annotated tag vX.Y.Z
 *  7. Pushes main + the tag to origin
 *  8. Switches back to develop
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

/**
 * Push to origin, embedding a PAT in the remote URL when available.
 * Checks GITHUB_PAT first, then GITHUB_TOKEN as fallback.
 * Falls back to plain git push (works in environments with their own auth).
 *
 * Note: the http.extraHeader approach does NOT work in Replit (git still
 * prompts "could not read Username"), so we rewrite the origin URL instead.
 * GIT_ASKPASS is cleared so Replit's askpass helper can't hang the push.
 */
function push(args: string): void {
  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
  if (token) {
    const originUrl = run("git remote get-url origin");
    const authedUrl = originUrl.replace(
      /^https:\/\/(?:[^@]+@)?github\.com\//,
      `https://x-access-token:${token}@github.com/`
    );
    // Replace "origin" (first word) with the authed URL; refs stay as-is.
    const rest = args.replace(/^origin\s*/, "");
    try {
      execSync(`git push "${authedUrl}" ${rest}`, {
        encoding: "utf-8",
        env: { ...process.env, GIT_ASKPASS: "" },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      // Never let the token leak into error output.
      const msg = String(err instanceof Error ? err.message : err).replaceAll(
        token,
        "***"
      );
      die(`git push ${rest} failed:\n${msg}`);
    }
  } else {
    run(`git push ${args}`);
  }
}

function die(msg: string): never {
  console.error(`\n❌  ${msg}\n`);
  process.exit(1);
}

function bumpVersion(
  current: string,
  bump: "patch" | "minor" | "major"
): string {
  const parts = current.replace(/^v/, "").split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    die(`Cannot parse current version "${current}"`);
  }
  const [major, minor, patch] = parts;
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

// ---------------------------------------------------------------------------
// Validate args
// ---------------------------------------------------------------------------

const bump = process.argv[2] as "patch" | "minor" | "major" | undefined;
if (!bump || !["patch", "minor", "major"].includes(bump)) {
  die('Usage: pnpm release patch | minor | major');
}

// ---------------------------------------------------------------------------
// Validate git state
// ---------------------------------------------------------------------------

const branch = run("git rev-parse --abbrev-ref HEAD");
if (branch !== "develop") {
  die(`Must be on the \`develop\` branch (currently on \`${branch}\`). Run: git checkout develop`);
}

const status = run("git status --porcelain");
if (status.length > 0) {
  die(
    `Working tree is not clean. Commit or stash your changes before releasing.\n\n${status}`
  );
}

// ---------------------------------------------------------------------------
// Determine next version
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dirname, "..");

const rootPkgPath = resolve(ROOT, "package.json");
const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf-8")) as {
  version: string;
  [k: string]: unknown;
};

const currentVersion = rootPkg.version;
const nextVersion = bumpVersion(currentVersion, bump);
const tag = `v${nextVersion}`;

console.log(`\nReleasing ${currentVersion} → ${nextVersion}  (${tag})\n`);

// ---------------------------------------------------------------------------
// All workspace package.json files to bump
// ---------------------------------------------------------------------------

const PKG_PATHS = [
  "package.json",
  "artifacts/sample-handyman/package.json",
  "lib/api-client-react/package.json",
  "lib/api-spec/package.json",
  "lib/api-zod/package.json",
  "scripts/package.json",
].map((p) => resolve(ROOT, p));

// ---------------------------------------------------------------------------
// Bump versions atomically (all files written before any git commands)
// ---------------------------------------------------------------------------

for (const pkgPath of PKG_PATHS) {
  const raw = readFileSync(pkgPath, "utf-8");
  const pkg = JSON.parse(raw) as { version: string; [k: string]: unknown };
  pkg.version = nextVersion;
  // Preserve trailing newline if present
  const trailing = raw.endsWith("\n") ? "\n" : "";
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + trailing, "utf-8");
  console.log(`  ✓ ${pkgPath.replace(ROOT + "/", "")}  →  ${nextVersion}`);
}

// ---------------------------------------------------------------------------
// Commit the version bump on develop
// ---------------------------------------------------------------------------

run("git add -A");
run(`git commit -m "chore: release ${tag}"`);
console.log(`\n✓ Committed version bump on develop`);

// ---------------------------------------------------------------------------
// Push develop
// ---------------------------------------------------------------------------

push("origin develop");
console.log("✓ Pushed develop to origin");

// ---------------------------------------------------------------------------
// Merge develop → main (fast-forward only)
// ---------------------------------------------------------------------------

run("git checkout main");
run("git merge --ff-only develop");
console.log("✓ Merged develop → main (fast-forward)");

// ---------------------------------------------------------------------------
// Tag and push main
// ---------------------------------------------------------------------------

run(`git tag -a ${tag} -m "Release ${tag}"`);
push("origin main --follow-tags");
console.log(`✓ Pushed main + tag ${tag} to origin`);

// ---------------------------------------------------------------------------
// Return to develop
// ---------------------------------------------------------------------------

run("git checkout develop");
console.log("✓ Switched back to develop\n");

console.log(`🎉  Released ${tag} successfully!`);
console.log(`    main is now at ${run("git rev-parse --short main")}`);
console.log(`    develop continues at ${run("git rev-parse --short develop")}\n`);
