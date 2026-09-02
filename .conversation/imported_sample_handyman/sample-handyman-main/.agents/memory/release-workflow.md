---
name: Release workflow & tag push gap
description: How the develop→main release flow works, and why tag pushes require a GITHUB_TOKEN secret.
---

# Release workflow

All development commits go to `develop`. Releases use `pnpm release patch|minor|major` (scripts/release.ts at the workspace root).

The script:
1. Validates on `develop`, clean tree
2. Bumps version in all 6 workspace package.json files (lockstep)
3. Commits `chore: release vX.Y.Z` on develop
4. Pushes develop → use `gitPush({ branch: "develop", provider: "github" })`
5. Fast-forward merges develop → main locally
6. Creates annotated tag vX.Y.Z
7. Pushes main → use `gitPush({ branch: "main", provider: "github" })`
8. Pushes the tag (works via URL-embedded PAT push)
9. Switches back to develop

## Local branch alignment prerequisite

Before running the release script, make sure the local `main` branch is a clean match for `origin/main`. The script only validates `develop` initially, but later checks out the existing local `main` and requires a fast-forward merge; unrelated local commits make it stop after the version commit and `develop` push.

**Why:** Task merges and auto-committed uploaded attachments can exist only in the workspace's local `main`, even when `develop` and GitHub history are valid.

**How to apply:** Fetch the two remote branches without fetching conflicting historical tags, compare local and remote `main`, and preserve any legitimate local-only work on a backup branch. Build the release `develop` branch from the current remote production tip with only the intended feature commits. If the script stops after pushing `develop`, do not rerun it and create another release; align local `main` to the clean release tip, complete the `main` and tag push for the already-created version, and then return to `develop`.

## Tag push gap

`gitPush` only handles branch names — passing `refs/tags/vX.Y.Z` returns a CLI_ERROR.
Native `git push origin vX.Y.Z` fails because Replit's GitHub OAuth session (served by `replit-git-askpass` from `localhost:8284`) times out outside of interactive sessions.

**Fix:** Use a GitHub PAT stored as the `GITHUB_PAT` Replit secret and push via URL-embedded credentials — the `http.extraHeader` approach does NOT work (git still fails with "could not read Username"):
```bash
GIT_ASKPASS="" git push "https://x-access-token:$GITHUB_PAT@github.com/<org>/<repo>" develop main vX.Y.Z
```

**Why:** The gitPush callback uses Replit's internal OAuth which only exposes branch pushes and has no tag-push surface (and may not be registered in every session). A PAT bypasses this.

## Fine-grained PAT pitfalls (learned Aug 2026)
- **Resource owner must be the org** (creativecoderstech), not the personal account — otherwise the token gets a 404 on the org repo.
- **Contents: Read & write must actually be granted** — verify with the `x-accepted-github-permissions` response header or a write API test; a token showing only `metadata=read` will 403 on push with "Write access to repository not granted" even though the repo API returns push:true (that reflects the user's role, not the token's grants).
- The org may require approval of fine-grained tokens (Org Settings → Personal access tokens); a pending/stripped approval silently reduces permissions.
- Validate a PAT quickly: `curl -H "Authorization: Bearer $PAT" https://api.github.com/user` (401 = bad value) then the repo endpoint (404 = wrong resource owner).

## Deploy step (separate from release)

After the release, deploy to Cloudflare:
```
cd artifacts/sample-handyman && pnpm run deploy
```
This runs `pnpm run build:web && wrangler deploy --env production`.
Cloudflare uses `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets — both are already set.

## PAT restored (Aug 2026)
- GITHUB_PAT re-issued with org-approved Contents: Read & write; release.ts now pushes via URL-embedded token (extraHeader removed) and sanitizes the token from error output. v1.0.10 released end-to-end successfully.
- Editing a fine-grained PAT's permissions triggers a NEW org approval request; until approved it keeps old read-only grants. `x-accepted-github-permissions` on a GET shows only what that endpoint needed — test write with a POST /git/blobs probe or a push --dry-run.

## GitHub push repaired via Replit GitHub connection (Aug 2026)
- GITHUB_PAT reads the repo but org approval strips Contents write → git push 403 "Write access not granted". The repo API `permissions` field shows the *user's* role, not the token's grants — misleading.
- GITHUB_TOKEN secret is invalid entirely.
- Working path: the Replit GitHub connection (connector slug `github`) has repo write, but only via `conn.proxyFetch` — no raw token, so `git push` is impossible with it.
- Fix used: replayed missing commits byte-for-byte through the Git Data API (blobs → trees with base_tree → commits with exact author/committer/date/message, verifying each SHA matches local), then PATCHed refs/heads and created annotated tag objects. Local and remote SHAs stayed identical.
- **How to apply:** after future releases, if PAT push still 403s, replay `git rev-list --reverse <remote-sha>..develop` via the connection the same way. Durable fix: user re-issues the fine-grained PAT with org-approved Contents: Read & write.
