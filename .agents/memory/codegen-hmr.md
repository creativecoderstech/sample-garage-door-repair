---
name: Generated API clients and hot reload
description: Distinguish transient Vite errors during API regeneration from persistent application failures.
---

API regeneration can briefly remove generated modules while Vite is watching them. Hot reload may report missing generated files or invalid component exports even when regeneration and TypeScript checks subsequently pass.

**Why:** Parallel contract and frontend work produced repeated browser errors during the generator's clean/write window. Those messages described an intermediate filesystem state, not the completed build.

**How to apply:** Finish the contract/codegen batch before diagnosing these messages. Check the completed library and application typechecks, then restart the managed web workflow once and examine only fresh logs. Do not patch generated files or rewrite working imports to fix an earlier transient error.