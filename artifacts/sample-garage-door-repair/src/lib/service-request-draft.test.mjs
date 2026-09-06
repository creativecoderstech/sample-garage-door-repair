import test from "node:test";
import assert from "node:assert/strict";
import { readServiceRequestDraft, clearServiceRequestDraft, SERVICE_REQUEST_DRAFT_KEY } from "./service-request-draft.ts";

test("Maya handoff survives a mounted source form, destination mount and refresh", () => {
  const values = new Map([[SERVICE_REQUEST_DRAFT_KEY, JSON.stringify({ service: "repair", urgency: "emergency", details: "My garage door is crooked and the cable is loose" })]]);
  const storage = { getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key) };
  const sourceForm = readServiceRequestDraft(storage);
  const destinationForm = readServiceRequestDraft(storage);
  const afterRefresh = readServiceRequestDraft(storage);
  assert.deepEqual(sourceForm, destinationForm);
  assert.deepEqual(destinationForm, afterRefresh);
  assert.match(afterRefresh.details, /crooked/);
  clearServiceRequestDraft(storage);
  assert.equal(readServiceRequestDraft(storage), null);
});

test("invalid stored drafts are discarded without crashing the form", () => {
  let value = "{invalid";
  const storage = { getItem: () => value, removeItem: () => { value = null; } };
  assert.equal(readServiceRequestDraft(storage), null);
  assert.equal(value, null);
});