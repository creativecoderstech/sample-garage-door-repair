---
name: Orval zod integer pitfall
description: Why the OpenAPI spec uses `type: number` instead of `type: integer`
---

Rule: in `lib/api-spec/openapi.yaml`, use `type: number`, never `type: integer`.

**Why:** Orval's zod client generates `zod.int()` for `type: integer`, an API that only exists in zod v4; the workspace pins zod 3.x, so codegen output fails typecheck (TS2339 `Property 'int' does not exist`).

**How to apply:** whenever adding/editing schemas in openapi.yaml before running `pnpm --filter @workspace/api-spec run codegen`.
