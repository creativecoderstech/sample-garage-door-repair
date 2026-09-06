---
name: Release review packaging
description: Include new source files and generated release assets in the staged tree before completion review.
---

Stage the complete task-scoped release tree before requesting completion review,
including new modules, migrations, generated contracts, and required build assets.

**Why:** The completion reviewer evaluates the tracked release diff. A working
workspace can still be rejected as unbuildable when newly imported modules or
fingerprinted assets remain untracked.

**How to apply:** Stage only the intended changes after building. Confirm that
the staged index includes every asset referenced by the generated HTML and that
removed fingerprinted assets are staged together with their replacements.