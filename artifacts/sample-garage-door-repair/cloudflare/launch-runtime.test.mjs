import test from "node:test";
import assert from "node:assert/strict";
import { launchRuntime } from "./launch-runtime.mjs";

const configured = {
  CLOUDFLARE_ENV: "production",
  PUBLIC_SITE_ORIGIN: "https://doors.business.test",
  DB: { prepare() {} }, MEDIA: { get() {}, put() {} },
  AI: { run() {} }, ASSETS: { fetch() {} },
  GOOGLE_OAUTH_CLIENT_ID: "fixture.apps.googleusercontent.com",
  TURNSTILE_SITE_KEY: "fixture-site", TURNSTILE_SECRET_KEY: "fixture-secret",
};
test("launch runtime fails closed for previews, missing bindings, development auth and test anti-bot keys", () => {
  assert.equal(launchRuntime(configured, configured.PUBLIC_SITE_ORIGIN).runtimeReady, true);
  for (const changes of [
    { CLOUDFLARE_ENV: "preview" }, { DB: undefined }, { MEDIA: undefined }, { AI: undefined },
    { ASSETS: undefined }, { GOOGLE_OAUTH_CLIENT_ID: "" },
    { TURNSTILE_SITE_KEY: "1x00000000000000000000AA" }, { PUBLIC_SITE_ORIGIN: "" },
    { PUBLIC_SITE_ORIGIN: "https://branch.pages.dev" },
  ]) assert.equal(launchRuntime({ ...configured, ...changes }, configured.PUBLIC_SITE_ORIGIN).runtimeReady, false);
  assert.equal(launchRuntime(configured, "https://branch.pages.dev").runtimeReady, false);
});
test("public checks never return credential values", () => {
  const output = JSON.stringify(launchRuntime(configured, configured.PUBLIC_SITE_ORIGIN));
  assert.ok(!output.includes(configured.TURNSTILE_SECRET_KEY));
});