---
name: GitHub template LFS cleanup
description: Why a repository can remain ineligible for template mode after all LFS pointers are removed.
---

Removing every Git LFS pointer and attribute from reachable Git history may still leave GitHub treating the repository as LFS-enabled.

**Why:** GitHub keeps uploaded LFS objects associated with the repository after history is rewritten. Its template setting can continue returning a validation error even when a fresh mirror has no LFS files.

**How to apply:** Verify a fresh remote mirror first. If it has no LFS files but GitHub still rejects template mode, stop rewriting history. GitHub’s documented options are Support-assisted object purging or deleting and recreating the repository; offer a separate clean template repository as the non-destructive alternative.