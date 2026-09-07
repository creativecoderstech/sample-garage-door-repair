# Owner pre-launch checklist

The website can be edited and reviewed before these owner-controlled inputs are
finished. Completing the software is not permission to publish it. No DNS changes,
production migrations, or public release are performed without the owner's
explicit publishing action.

## One checklist before approving public launch

- [ ] **Replace the temporary business details in Business settings.** The
  authorized examples are `(470) 555-0147`,
  `service@cumminggaragedoor.example`, Monday–Friday 8am–6pm / Saturday 9am–2pm /
  Sunday closed, and provisional Cumming/Forsyth County coverage. Verify the real
  phone, public email, hours and actual coverage individually. The sign-in email
  is not automatically a public contact or notification destination.
- [ ] **Review the public content and exact business preview.** Confirm all seven
  offerings and any published location. Verify each optional claim independently:
  team, experience, brands, payment options, financing, license/insurance,
  warranty and urgent-request policy. Leave unsupported claims blank. Inspiration
  photography is not evidence of the company's completed work.
- [ ] **Choose and test request notifications.** In notification settings, save
  an authorized, real HTTPS receiving endpoint. Securely configure its vetted
  exact public hostname in `NOTIFICATION_ALLOWED_HOSTS` first; its provider and
  DNS must be trusted (the app does not pin DNS). Confirm the receiver's intended
  email/dispatch destination, retention and access rules. Run the authorized test
  and confirm receipt; then submit one end-to-end request with a supported photo.
  Check the inbox, attachment and delivery status. A failure must be retried from
  the existing request, never by creating a duplicate customer request.
  Delivery failures stay visible until staff retry them; there is no unattended
  retry scheduler.
- [ ] **Complete the domain and Google authentication setup.** The owner chooses
  the production domain and business listing. Set the exact HTTPS
  `PUBLIC_SITE_ORIGIN` and `GOOGLE_OAUTH_CLIENT_ID` using secure
  configuration. Configure Google and the embedded sign-in/sign-up OAuth callback
  URLs for that domain. Ensure the Google OAuth client authorizes the final domain;
  automatic Replit hosting setup is not proof that an external Pages domain is
  authorized. Use the workspace Auth pane for supported provider configuration.
  Do not copy development keys into production or silently change providers.
- [ ] **Claim the initial owner account in the production environment.** Set
  `GARAGE_BOOTSTRAP_EMAIL` server-side to the exact owner-approved identity, then
  sign in with that verified Google account. The first arbitrary signup cannot
  become owner. Development and production have separate identity and role
  records. Grant a second approved test account access, verify its scope, revoke
  it, and confirm its next protected request is denied while Google remains
  signed in. Do not report this owner sign-in as completed before it occurs.
- [ ] **Approve and verify the production release.** Back up the existing D1
  database and R2 inventory; apply the reviewed additive migrations to the correct
  production binding only as part of the approved release. Confirm DB, MEDIA,
  AI and ASSETS bindings, live Turnstile keys/domain/actions, Google OAuth authorized origins and
  webhook delivery. Check real Workers AI responses, invalid-token rejection,
  private attachment denial, public paths and mobile navigation. Approve the
  verified business profile only after these checks.
- [ ] **Check search visibility on the chosen domain.** Only the approved
  production hostname may emit indexable pages, sitemap entries and truthful
  local-business data. Branch previews, staff pages and private resources remain
  non-indexed/protected. Confirm canonicals, robots and sitemap after deployment.

## Current boundary

Unconfigured notifications are explicitly shown as unconfigured. They never send
to the example address or to the owner login by default. Example phone and email
values are not clickable verified contact actions. Maya receives approved public
facts only; submitting a request does not reserve a time or confirm coverage.

Live Google consent, production domain callbacks, real notification receipt,
production bindings and live anti-bot/provider checks require the owner's selected
configuration and approved release. Local fixtures can test the authorization and
failure behavior, but cannot substitute for those real-world checks.