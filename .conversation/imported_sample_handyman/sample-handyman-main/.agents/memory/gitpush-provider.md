---
name: gitPush silent-fail
description: gitPush callback silently returns success without pushing when provider is omitted; always pass provider explicitly.
---

## Rule
Always call `gitPush({ branch: "main", provider: "github" })` — never `gitPush({})` alone.

**Why:** The `gitPush` callback returns `{ success: true, message: "Pushed to main on github" }` even when the push did not actually reach the remote (observed: local commit stayed ahead of origin/main after a "successful" call with no explicit provider). Passing `provider: "github"` explicitly causes the push to go through reliably.

**How to apply:** Every time you push before a deploy or after finishing a feature, include `provider: "github"` in the call. Verify with `git log --oneline origin/main -1` to confirm HEAD matches before deploying.
