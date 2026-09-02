---
name: GitHub LFS template compatibility
description: Removing Git LFS so this GitHub repository can become a template.
---

GitHub will not enable the Template repository setting while it retains Git LFS content. Removing the file from the working tree alone is not enough: rewrite the published history to remove the LFS paths, remove their `filter=lfs` rules, and force-update all release tags that still point into the old history. Even after every published ref is clean, GitHub retains the remote LFS objects in separate storage and still blocks template mode.

**Why:** Historical branches and release tags can keep LFS reachable after `main` is cleaned. GitHub also retains removed LFS objects remotely; history rewriting does not purge those objects.

**How to apply:** Get explicit consent for the history rewrite; base the rewrite on GitHub’s current tip so newer remote work is retained; use a force-with-lease for `main`; force-update affected tags; then use a fresh clone to confirm `git lfs ls-files --all` and an LFS-pointer scan both return no results. If GitHub still disables template mode, its documented options are GitHub Support purging the objects or deleting and recreating the repository, then restoring the clean branches and tags. Keep any recovery backup refs local only—do not publish them.
