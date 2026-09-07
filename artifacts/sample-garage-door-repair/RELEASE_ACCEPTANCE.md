# Cumming Garage Door Service — technical handoff

## Release status

This is a secured, editable technical preview, **not an approved public launch**.
No publishing, DNS change, live Google-account bootstrap, production migration or
real notification-receiver delivery was performed. Indexing and business approval
remain gated. The single owner checklist is [PRELAUNCH.md](./PRELAUNCH.md).

The Cloudflare integration did not expose usable resource-inspection tools in this
session. Existing live Pages resources and bindings were therefore **not validated**.
The release retains Pages advanced mode, D1, R2, Workers AI and Turnstile; it does
not substitute a standalone Worker. Google Identity Services configuration was confirmed, but that
does not establish external Pages domain/live-key compatibility.

## Application and data checks

- The staged source builds in a clean temporary directory using the frozen
  lockfile, without development `PORT` or `BASE_PATH` variables. The Pages
  fingerprint/entry/import verifier passes. Staff code is a separate lazy chunk,
  not part of the initial customer bundle.
- PostgreSQL development upgrades and repeated seeding passed. Fresh and
  existing-data fixtures preserve owner changes, deletions, verification
  decisions, custom records and customer requests. D1 fixtures apply the entire
  sorted migration set. No applied migration was discarded or reset.
- Signed-identity authorization fixtures exercise both adapters: exact verified
  Google bootstrap, immutable user binding, concurrent redemption, persistent
  grants/revocation, protected sole owner, ordinary-admin restrictions, next-request
  revocation and hostile-origin denial. These are fixtures, **not a real owner login**.
- Signed-identity CMS fixtures exercise edit, publish, unpublish, slug aliases,
  non-core deletion and protected core pages. Public filtering and per-claim
  projection reject sample contacts and unapproved location/trust claims.
- Actual handler request fixtures cover idempotency, transactional creation,
  interrupted uploads, same-file retries, completion/prepare races, notification
  failures, manual retry leases and production Turnstile missing/invalid/valid
  cases. External provider calls in those fixtures are mocked.
- Both adapters persist, replay and complete requests with a blank optional email;
  the Pages validator still requires that contract property to be a string.
- A separate real development-storage check uploaded a WebP to private storage,
  validated its MIME/total size/signature using signed ranged GET, finalized it,
  completed the same saved request and confirmed `unconfigured` notification
  status. It did not contact an external notification recipient.
- Live development public API checks confirm seven services with symptoms,
  expectations and FAQs; legal records; representative-only inspiration imagery;
  and anonymous denial for leads, full settings and staff access.

## Browser evidence and limits

The one focused browser pass confirmed the actual Maya provider's safety-first
off-track response, a reviewable issue-only handoff, temporary-chat reset,
session-draft persistence, form entry and one supported attachment ready to upload.
It exposed a legacy/canonical service-code mismatch; that was corrected in both
adapters and verified by focused service-selection tests. Booking options now use
the approved catalog's actual names, preserving operational handoff values without
reintroducing unpublished offerings through fallbacks.

The tester's own response logger then failed and its browser runtime could not be
recovered. The interrupted submit was persisted once as an incomplete request;
it did not silently disappear. **A complete browser submission, palette-picker
interaction across all five themes, keyboard-navigation pass and signed-in admin
browser journey are not claimed.** Actual HTTP/storage checks and signed-identity
fixtures provide the supplementary coverage described above.

Desktop/mobile customer screenshots and a staff-entry screenshot were inspected
separately. The five palette definitions remain available, but their complete
interactive browser matrix remains unverified because of the tooling interruption.
Real Google sign-in/sign-out across staff accounts and production integrations must
still be exercised with authorized accounts and production configuration.

Two clearly named synthetic acceptance requests remain in development only: one
interrupted browser request and one completed private-storage check. Neither is a
real customer appointment or evidence of production delivery.

## Repeatable checks

```sh
pnpm run typecheck
node --test artifacts/sample-garage-door-repair/cloudflare/*.test.mjs
pnpm --filter @workspace/db test:auth
pnpm --filter @workspace/db verify:migrations:garage
pnpm --filter @workspace/api-server test:staff-origin
pnpm --filter @workspace/api-server exec tsx --test src/lib/*.test.mjs
node --experimental-strip-types --test artifacts/sample-garage-door-repair/src/lib/*.test.mjs
pnpm --filter @workspace/sample-garage-door-repair build:pages
pnpm --filter @workspace/sample-garage-door-repair verify:cloudflare-release
node scripts/verify-garage-staged-release.mjs
```

The staged-source check expects all required changes to be staged first. It does
not deploy or migrate any database. Photo provenance and derivative rights are in
[PHOTO_SOURCES.md](./PHOTO_SOURCES.md); the release and migration procedure is in
[CLOUDFLARE_ARCHITECTURE.md](./CLOUDFLARE_ARCHITECTURE.md).