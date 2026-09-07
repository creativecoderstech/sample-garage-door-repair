---
name: Private storage verification
description: Why private-upload verification needs the real provider contract as well as mocked lifecycle tests.
---

Validate the real provider's signed-method and range-response contract rather than assuming every HTTP storage operation is interchangeable.

**Why:** Permissive storage mocks can accept methods or response metadata that the actual signer rejects. Successful upload authorization alone does not establish that a separate verification method is supported.

**How to apply:** Keep mocks faithful to observed provider behavior and retain strict size, MIME and signature checks when adapting verification to a supported method.