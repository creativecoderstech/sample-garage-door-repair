import assert from "node:assert/strict";
import test from "node:test";
import { selectApprovedService as selectExpress } from "../routes/garage.ts";
import { selectApprovedService as selectPages } from "../../../sample-garage-door-repair/cloudflare/worker.mjs";

const canonical = [
  "garage-door-repair",
  "broken-spring-replacement",
  "garage-door-opener-repair-installation",
  "cable-roller-off-track-repair",
  "new-garage-door-installation",
  "garage-door-maintenance-tune-ups",
  "commercial-garage-door-services",
];

for (const [message, expected] of [
  ["The garage door is stuck and grinding", "garage-door-repair"],
  ["I heard a bang and the torsion spring broke", "broken-spring-replacement"],
  ["The opener remote and safety sensor stopped working", "garage-door-opener-repair-installation"],
  ["The cable snapped and rollers came off track", "cable-roller-off-track-repair"],
  ["We want a new insulated garage door installed", "new-garage-door-installation"],
  ["The door needs an annual tune-up and lubrication", "garage-door-maintenance-tune-ups"],
  ["Our warehouse commercial overhead door is damaged", "commercial-garage-door-services"],
]) {
  test(`approved service selection maps ${expected}`, () => {
    assert.equal(selectExpress(message, canonical), expected);
    assert.equal(selectPages(message, canonical), expected);
  });
}

test("selection supports approved legacy codes and never returns an unpublished candidate", () => {
  const legacy = ["repair", "springs", "opener", "installation", "maintenance", "hardware", "commercial"];
  assert.equal(selectExpress("rollers are off track", legacy), "hardware");
  assert.equal(selectPages("commercial overhead door", legacy), "commercial");
  assert.equal(selectExpress("torsion spring broke", ["garage-door-repair"]), "Service assessment");
  assert.equal(selectPages("torsion spring broke", []), "Service assessment");
});