# Google OAuth Setup for Admin Login

The admin panel at **https://admin.sample-handyman.com** uses Google Sign-In.
Follow the steps below **once** to wire up the OAuth app in Google Cloud Console and
store the credentials as Cloudflare secrets.

---

## 1. Add the production redirect URI in Google Cloud Console

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click the **OAuth 2.0 Client ID** used by this project.
3. Under **Authorized redirect URIs**, click **+ ADD URI** and enter:
   ```
   https://admin.sample-handyman.com/api/auth/callback
   ```
4. Click **Save**.

> **Why this URI?**  
> `worker/auth.ts` constructs the redirect URI as  
> `${ADMIN_ORIGIN}/api/auth/callback`  
> where `ADMIN_ORIGIN` is set to `https://admin.sample-handyman.com` in  
> `wrangler.jsonc` (production env `vars`). If the URI is absent from Google's  
> allow-list, Google returns a `redirect_uri_mismatch` error and login fails.

---

## 2. Store credentials as Cloudflare Worker secrets

Run the following commands (you'll be prompted to paste each value):

```bash
cd artifacts/sample-handyman

# OAuth Client ID (from the Credentials page — looks like xxxxxx.apps.googleusercontent.com)
npx wrangler secret put GOOGLE_CLIENT_ID --env production

# OAuth Client Secret (from the same Credentials page)
npx wrangler secret put GOOGLE_CLIENT_SECRET --env production

# A random 64-char string used to sign session cookies
# Generate one with: openssl rand -base64 48
npx wrangler secret put SESSION_SECRET --env production
```

These secrets are encrypted at rest by Cloudflare and are never exposed in
`wrangler.jsonc` or source control.

---

## 3. Verify login works

1. Visit **https://admin.sample-handyman.com**.
2. Click **Sign in with Google**.
3. Complete the Google consent screen.
4. You should be redirected back to the admin dashboard and signed in.

### Common errors

| Error shown | Likely cause | Fix |
|---|---|---|
| `redirect_uri_mismatch` | Production URI not in Google allow-list | Re-check Step 1 |
| `not_configured` / 503 | Secrets not deployed | Re-run Step 2 |
| `not_invited` | Email not in the `users` table | Add the user via the admin panel or directly in the D1 database |
| `disabled` | User account is disabled | Re-enable in the admin panel |
| `email_unverified` | Google account email is not verified | Ask user to verify their Google account |

---

## 4. (Optional) Add the local dev redirect URI

If you want to test OAuth locally with `wrangler dev`, also add:

```
http://localhost:5000/api/auth/callback
```

and set the secrets for the `dev` environment:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID --env dev
npx wrangler secret put GOOGLE_CLIENT_SECRET --env dev
npx wrangler secret put SESSION_SECRET --env dev
```
